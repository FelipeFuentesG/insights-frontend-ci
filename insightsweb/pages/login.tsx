import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../lib/api";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Email o contraseña incorrectos.");
        return;
      }

      const { token } = await res.json();
      localStorage.setItem("token", token);
      router.push("/home");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="layout-login-main">
      <div className="layout-login-form-side">
        <div className="layout-login-card">
          <Link href="/" className="layout-login-logo">
            <Image
              src="/logo_AndesML.png"
              alt="AndesML"
              height={32}
              width={148}
              style={{ width: "auto", height: "32px" }}
              priority
            />
          </Link>

          <div className="layout-login-header">
            <h1 className="layout-login-title">Bienvenido</h1>
            <p className="layout-login-subtitle">
              Ingresa tu información para acceder a tu cuenta.
            </p>
          </div>

          <form className="layout-login-form" onSubmit={handleSubmit}>
            <div className="layout-login-field">
              <label className="layout-login-label">Email</label>
              <input
                type="email"
                placeholder="nombre@empresa.com"
                className="layout-login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="layout-login-field">
              <label className="layout-login-label">Contraseña</label>
              <div className="layout-login-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  className="layout-login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="layout-login-eye"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword
                    ? <img src="/eye-show.svg" alt="ocultar" width="20" height="20" />
                    : <img src="/eye-off.svg" alt="mostrar" width="20" height="20" />}
                </button>
              </div>
            </div>

            {error && <p className="layout-login-error">{error}</p>}

            <button
              type="submit"
              className="layout-login-btn"
              disabled={loading}
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

          <p className="layout-login-register">
            ¿No eres usuario?{" "}
            <Link href="/register" className="layout-login-register-link">
              Regístrate
            </Link>
          </p>
        </div>
      </div>

      <div className="layout-login-promo-side">
        <div className="layout-login-promo-content">
          <h2 className="layout-login-promo-title">
            La Plataforma de<br />retail media
          </h2>
          <p className="layout-login-promo-subtitle">
            Desde LATAM al mundo.
          </p>
        </div>
      </div>
    </main>
  );
}
