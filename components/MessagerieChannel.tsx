"use client"
// ════════════════════════════════════════════════════════════════════════════
//  MessagerieChannel — canal de communication unifié livreurs ↔ clients ↔
//  responsables. Fil de discussion partagé (Supabase fl_messages), ciblage par
//  audience (rôles). Réutilisé en back-office ET en mobile.
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from "react"
import { store, type User, type Message } from "@/lib/store"
import { upsertMessage } from "@/lib/supabase/db"

// Audiences cibles (clé → rôles concernés). "tous" = visible par tout le monde.
const AUDIENCES: { key: string; label: string; roles: string[] }[] = [
  { key: "tous",         label: "Tous",         roles: [] },
  { key: "livreurs",     label: "Livreurs",     roles: ["livreur", "dispatcheur"] },
  { key: "commerciaux",  label: "Commerciaux",  roles: ["prevendeur", "resp_commercial", "team_leader"] },
  { key: "logistique",   label: "Logistique",   roles: ["resp_logistique", "magasinier", "dispatcheur", "chef_depot"] },
  { key: "responsables", label: "Responsables", roles: ["admin", "super_admin", "super_super_admin", "resp_logistique", "resp_commercial"] },
  { key: "clients",      label: "Clients",      roles: ["client", "client_proprietaire", "client_gerant"] },
]

function relTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ""
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  return new Date(iso).toLocaleDateString("fr-MA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

export default function MessagerieChannel({ user, compact = false }: { user: User; compact?: boolean }) {
  const [msgs, setMsgs] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [aud, setAud] = useState<string>("tous")
  const [sending, setSending] = useState(false)
  const [callPick, setCallPick] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const contacts = callPick ? store.getUsers().filter(u => u.id !== user.id && u.actif !== false) : []

  const load = () => {
    const all = store.getMessages()
      .filter(m => (m.channel ?? "general") === "general")
      .filter(m => m.senderId === user.id || !m.audience || m.audience.length === 0 || m.audience.includes(String(user.role)))
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    setMsgs(all)
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs.length])

  const send = async () => {
    const t = text.trim()
    if (!t || sending) return
    const roles = AUDIENCES.find(a => a.key === aud)?.roles ?? []
    const m: Message = {
      id: `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: user.id, senderName: user.name, role: user.role,
      text: t, createdAt: new Date().toISOString(),
      channel: "general",
      audience: roles.length ? roles : undefined,
      readBy: [user.id],
    }
    setText("")
    setSending(true)
    try { await upsertMessage(m) } catch { /* sync best-effort */ }
    load()
    setSending(false)
  }

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ height: compact ? 420 : 560 }}>
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <p className="font-bold text-slate-900 text-sm">💬 Messagerie d'équipe</p>
          <p className="text-[11px] text-slate-400">Livreurs · commerciaux · logistique · responsables · clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCallPick(v => !v)} className="text-xs font-semibold text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50">📞 Appeler</button>
          <button onClick={load} className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100">↻ Actualiser</button>
        </div>
      </div>
      {callPick && (
        <div className="px-3 py-2 border-b border-slate-200 bg-white max-h-44 overflow-y-auto">
          <p className="text-[11px] text-slate-400 mb-1">Appel audio dans l'ERP (sans WhatsApp) :</p>
          <div className="flex flex-col gap-1">
            {contacts.length === 0 && <span className="text-xs text-slate-400">Aucun contact disponible.</span>}
            {contacts.map(c => (
              <button key={c.id}
                onClick={() => { setCallPick(false); window.dispatchEvent(new CustomEvent("fl-call-start", { detail: { id: c.id, name: c.name } })) }}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-emerald-50 text-sm">
                <span className="truncate">{c.name} <span className="text-[11px] text-slate-400">· {String(c.role)}</span></span>
                <span className="text-emerald-600">📞</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-slate-50/40">
        {msgs.length === 0 && (
          <p className="text-center text-xs text-slate-400 mt-8">Aucun message. Démarrez la conversation ci-dessous.</p>
        )}
        {msgs.map(m => {
          const mine = m.senderId === user.id
          return (
            <div key={m.id} className={`flex flex-col max-w-[85%] ${mine ? "self-end items-end" : "self-start items-start"}`}>
              <div className={`px-3 py-2 rounded-2xl text-sm ${mine ? "bg-emerald-600 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"}`}>
                {!mine && <span className="block text-[11px] font-bold text-slate-500 mb-0.5">{m.senderName} · {String(m.role)}</span>}
                <span className="whitespace-pre-wrap break-words">{m.text}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                {relTime(m.createdAt)}{m.audience && m.audience.length ? ` · → ${AUDIENCES.find(a => a.roles.join() === m.audience!.join())?.label ?? "ciblé"}` : ""}
              </span>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-slate-200 p-3 bg-white">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {AUDIENCES.map(a => (
            <button key={a.key} onClick={() => setAud(a.key)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${aud === a.key ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              {a.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send() } }}
            rows={2}
            placeholder={`Message à « ${AUDIENCES.find(a => a.key === aud)?.label} »…`}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <button onClick={() => void send()} disabled={!text.trim() || sending}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 transition-opacity">
            {sending ? "…" : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  )
}
