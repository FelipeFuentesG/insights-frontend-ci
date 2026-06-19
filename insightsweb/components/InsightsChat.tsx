import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { apiFetch } from "../lib/api";

type Rol = "admin_marca" | "admin_retailer" | "admin_global_andesml";

export interface StoredUser {
  idUsuario: number;
  idRetailer: number | null;
  idMarca: number | null;
  nombre: string;
  email: string;
  rol: Rol;
  marcaNombre?: string;
  retailerNombre?: string;
}

interface Message {
  role: "user" | "ai" | "error";
  text: string;
}

interface AIResponse {
  respuesta: string | null;
  error: string | null;
}

interface Props {
  user: StoredUser | null;
  /** Contexto opcional que se envía a Gemini junto con cada pregunta.
   *  Si es null/undefined, el chat funciona en modo general (Insights). */
  contexto?: string | null;
  /** Preguntas sugeridas que se muestran como chips antes del primer mensaje. */
  suggestions?: string[];
}

export default function InsightsChat({ user, contexto = null, suggestions }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (pregunta: string) => {
    if (!pregunta || loading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", text: pregunta }]);
    setLoading(true);

    try {
      const res = await apiFetch("/ai/ask", {
        method: "POST",
        body: JSON.stringify({ pregunta, contexto: contexto ?? null }),
      });
      const data: AIResponse = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: "error", text: data.error! }]);
      } else {
        setMessages(prev => [...prev, { role: "ai", text: data.respuesta ?? "" }]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "error", text: "Error de conexión. Inténtalo de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => send(input.trim());

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const firstName = user?.nombre.split(" ")[0];

  return (
    <>
      <div className="ai-messages">
        {messages.length === 0 && (
          <>
            <p className="ai-msg ai-msg--ai">
              Hola{firstName ? `, ${firstName}` : ""}. ¿En qué te puedo ayudar?
            </p>
            {suggestions && suggestions.length > 0 && (
              <div className="ai-suggestions">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="ai-suggestion-chip"
                    onClick={() => send(s)}
                    disabled={loading}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {messages.map((msg, i) =>
          msg.role === "ai" ? (
            <div key={i} className={`ai-msg ai-msg--${msg.role}`}>
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          ) : (
            <p key={i} className={`ai-msg ai-msg--${msg.role}`}>
              {msg.text}
            </p>
          )
        )}
        {loading && (
          <p className="ai-msg ai-msg--thinking">Pensando…</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-input-bar">
        <textarea
          className="ai-input"
          placeholder="Escribe tu pregunta… (Enter para enviar)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={1}
        />
        <button
          className="ai-send-btn"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          aria-label="Enviar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </>
  );
}
