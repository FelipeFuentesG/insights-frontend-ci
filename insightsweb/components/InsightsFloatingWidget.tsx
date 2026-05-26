import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import InsightsChat, { StoredUser } from "./InsightsChat";

export const AI_WIDGET_ROUTES: string[] = ["/insights"];

export default function InsightsFloatingWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;
    try { setUser(JSON.parse(stored)); } catch {}
  }, []);

  if (!AI_WIDGET_ROUTES.includes(router.pathname)) return null;

  return (
    <>
      {open && (
        <div className="ai-panel" role="dialog" aria-label="Asistente IA">
          <div className="ai-panel-header">
            <h2>Asistente IA</h2>
            <button
              className="ai-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <InsightsChat user={user} />
        </div>
      )}

      <button
        className="ai-fab"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Cerrar asistente" : "Abrir asistente IA"}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </>
  );
}
