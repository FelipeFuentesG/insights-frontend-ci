import { useState } from "react";
import InsightsChat, { StoredUser } from "./InsightsChat";

interface Props {
  user: StoredUser | null;
  /** Contexto que recibe Gemini con cada pregunta (p. ej. estadísticas del producto). */
  contexto?: string | null;
  /** Preguntas sugeridas mostradas como chips. */
  suggestions?: string[];
  /** Título del encabezado del panel. */
  title?: string;
}

/**
 * Widget flotante de chat con IA (FAB + panel). Encapsula el estado de
 * abierto/cerrado y reutiliza <InsightsChat />. Es agnóstico de la ruta:
 * la lógica de en qué páginas mostrarse vive en quien lo renderiza.
 */
export default function InsightsChatWidget({
  user,
  contexto = null,
  suggestions,
  title = "Asistente IA",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="ai-panel" role="dialog" aria-label={title}>
          <div className="ai-panel-header">
            <h2>{title}</h2>
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
          <InsightsChat user={user} contexto={contexto} suggestions={suggestions} />
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
