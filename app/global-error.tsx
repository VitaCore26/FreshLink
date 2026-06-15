"use client"

// Capture les erreurs survenant dans le layout racine lui-même (doit fournir
// son propre <html>/<body>). Affiche le message réel + récupération.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 }}>
          <div style={{ maxWidth: 440, width: "100%", background: "#fff", border: "1px solid #fecaca", borderRadius: 16, padding: 28, boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>⚠️ Erreur de l&apos;application</p>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px" }}>Un problème est survenu au chargement.</p>
            <pre style={{ fontSize: 11, color: "#dc2626", background: "#fef2f2", borderRadius: 10, padding: 12, whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 140, overflow: "auto", margin: 0 }}>
              {error?.message}{error?.digest ? `  (${error.digest})` : ""}
            </pre>
            <button
              onClick={() => { try { localStorage.clear() } catch { /* noop */ } location.reload() }}
              style={{ width: "100%", padding: 12, borderRadius: 10, fontWeight: 700, color: "#fff", background: "#16a34a", border: "none", cursor: "pointer", marginTop: 12 }}>
              Réinitialiser et recharger
            </button>
            <button
              onClick={() => reset()}
              style={{ width: "100%", padding: 12, borderRadius: 10, fontWeight: 700, color: "#fff", background: "#475569", border: "none", cursor: "pointer", marginTop: 8 }}>
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
