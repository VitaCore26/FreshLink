"use client"
// ════════════════════════════════════════════════════════════════════════════
//  CallCenter — appels audio 1:1 DANS l'ERP (hors WhatsApp).
//  • Média : WebRTC (RTCPeerConnection) + micro (getUserMedia).
//  • Signalisation : Supabase Realtime broadcast, canal "fl-calls" (offer/
//    answer/ice/hangup), filtrée par destinataire (to === user.id).
//  • NAT : STUN public Google. ⚠ Pour une fiabilité 4G/NAT symétrique il faut
//    un serveur TURN (à provisionner) — sans lui, l'appel peut échouer sur
//    certains réseaux mobiles. Le composant accepte un TURN optionnel via
//    NEXT_PUBLIC_TURN_URL / _USER / _CRED.
//  Monté une fois par layout (mobile + back-office). L'appel se déclenche par
//  un évènement window "fl-call-start" {detail:{id,name}} (depuis la messagerie).
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"
import type { User } from "@/lib/store"

type Phase = "idle" | "calling" | "incoming" | "connected"
type Signal = { kind: "offer" | "answer" | "ice" | "hangup"; to: string; from: { id: string; name: string }; data?: unknown }

function iceServers(): RTCIceServer[] {
  const list: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ]
  const turn = process.env.NEXT_PUBLIC_TURN_URL
  if (turn) {
    list.push({ urls: turn, username: process.env.NEXT_PUBLIC_TURN_USER, credential: process.env.NEXT_PUBLIC_TURN_CRED })
  } else {
    // Fallback TURN public GRATUIT (OpenRelay/Metered) — identifiants PUBLICS,
    // pas un secret. Rate-limité : suffit pour démarrer et faire passer les
    // appels derrière la 4G / NAT symétrique. Pour la prod, fournir un TURN
    // dédié via NEXT_PUBLIC_TURN_URL/_USER/_CRED (il prend alors le dessus).
    list.push(
      { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
      { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
      { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
    )
  }
  return list
}

export default function CallCenter({ user }: { user: User }) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [peer, setPeer] = useState<{ id: string; name: string } | null>(null)
  const [muted, setMuted] = useState(false)
  const [secs, setSecs] = useState(0)

  const phaseRef = useRef<Phase>("idle")
  const setPhaseR = (p: Phase) => { phaseRef.current = p; setPhase(p) }
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localRef = useRef<MediaStream | null>(null)
  const chanRef = useRef<RealtimeChannel | null>(null)
  const pendingOffer = useRef<RTCSessionDescriptionInit | null>(null)
  const peerRef = useRef<{ id: string; name: string } | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const setPeerR = (p: { id: string; name: string } | null) => { peerRef.current = p; setPeer(p) }
  const send = (s: Signal) => { void chanRef.current?.send({ type: "broadcast", event: "signal", payload: s }) }

  const cleanup = () => {
    try { pcRef.current?.close() } catch { /* noop */ }
    pcRef.current = null
    localRef.current?.getTracks().forEach(t => t.stop()); localRef.current = null
    pendingOffer.current = null
    setPhaseR("idle"); setPeerR(null); setMuted(false); setSecs(0)
  }

  const newPC = (peerId: string) => {
    const pc = new RTCPeerConnection({ iceServers: iceServers() })
    pc.onicecandidate = e => { if (e.candidate) send({ kind: "ice", to: peerId, from: { id: user.id, name: user.name }, data: e.candidate.toJSON() }) }
    pc.ontrack = e => { if (audioRef.current) { audioRef.current.srcObject = e.streams[0]; void audioRef.current.play().catch(() => {}) } }
    pcRef.current = pc
    return pc
  }

  const getMic = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true })
    localRef.current = s
    return s
  }

  const startCall = async (target: { id: string; name: string }) => {
    if (phaseRef.current !== "idle" || target.id === user.id) return
    try {
      setPeerR(target); setPhaseR("calling")
      const pc = newPC(target.id)
      const mic = await getMic()
      mic.getTracks().forEach(t => pc.addTrack(t, mic))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      send({ kind: "offer", to: target.id, from: { id: user.id, name: user.name }, data: offer })
    } catch { cleanup() }
  }

  const accept = async () => {
    const p = peerRef.current
    if (!p || !pendingOffer.current) return
    try {
      const pc = newPC(p.id)
      const mic = await getMic()
      mic.getTracks().forEach(t => pc.addTrack(t, mic))
      await pc.setRemoteDescription(pendingOffer.current)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      send({ kind: "answer", to: p.id, from: { id: user.id, name: user.name }, data: answer })
      setPhaseR("connected")
    } catch { hangup() }
  }

  const hangup = () => { const p = peerRef.current; if (p) send({ kind: "hangup", to: p.id, from: { id: user.id, name: user.name } }); cleanup() }

  const toggleMute = () => {
    const s = localRef.current; if (!s) return
    const next = !muted; s.getAudioTracks().forEach(t => { t.enabled = !next }); setMuted(next)
  }

  const handleSignal = async (s: Signal) => {
    if (s.kind === "offer") {
      if (phaseRef.current !== "idle") { send({ kind: "hangup", to: s.from.id, from: { id: user.id, name: user.name } }); return }
      pendingOffer.current = s.data as RTCSessionDescriptionInit
      setPeerR(s.from); setPhaseR("incoming")
    } else if (s.kind === "answer") {
      try { await pcRef.current?.setRemoteDescription(s.data as RTCSessionDescriptionInit) } catch { /* noop */ }
      setPhaseR("connected")
    } else if (s.kind === "ice") {
      try { await pcRef.current?.addIceCandidate(s.data as RTCIceCandidateInit) } catch { /* noop */ }
    } else if (s.kind === "hangup") {
      cleanup()
    }
  }
  const handlerRef = useRef(handleSignal)
  handlerRef.current = handleSignal

  // Abonnement à la signalisation
  useEffect(() => {
    if (!user?.id) return
    const sb = createClient()
    const ch = sb.channel("fl-calls", { config: { broadcast: { self: false } } })
    ch.on("broadcast", { event: "signal" }, ({ payload }) => {
      const s = payload as Signal
      if (s && s.to === user.id) void handlerRef.current(s)
    }).subscribe()
    chanRef.current = ch
    return () => { void sb.removeChannel(ch); chanRef.current = null }
  }, [user?.id])

  // Déclenchement depuis la messagerie
  useEffect(() => {
    const onStart = (e: Event) => { const d = (e as CustomEvent).detail as { id: string; name: string }; if (d) void startCall(d) }
    window.addEventListener("fl-call-start", onStart as EventListener)
    return () => window.removeEventListener("fl-call-start", onStart as EventListener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Chrono appel connecté
  useEffect(() => {
    if (phase !== "connected") return
    const iv = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(iv)
  }, [phase])

  const mmss = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`

  return (
    <>
      <audio ref={audioRef} autoPlay hidden />
      {phase !== "idle" && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 9999, display: "flex", justifyContent: "center", padding: "12px", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }} className="w-full max-w-md rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center text-lg font-bold">
                {(peer?.name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{peer?.name ?? "Appel"}</p>
                <p className="text-xs text-slate-300">
                  {phase === "calling" ? "Appel en cours…" : phase === "incoming" ? "Appel entrant…" : `En communication · ${mmss}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {phase === "incoming" && (
                  <button onClick={() => void accept()} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-bold">Accepter</button>
                )}
                {phase === "connected" && (
                  <button onClick={toggleMute} className={`px-3 py-2 rounded-xl text-sm font-bold ${muted ? "bg-amber-500" : "bg-slate-700 hover:bg-slate-600"}`}>{muted ? "Activer micro" : "Couper micro"}</button>
                )}
                <button onClick={hangup} className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-bold">
                  {phase === "incoming" ? "Refuser" : "Raccrocher"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
