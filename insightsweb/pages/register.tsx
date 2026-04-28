import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../lib/api";

type UserType = "admin" | "marca" | "retail" | null;

const USER_TYPES: { value: UserType; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Gestiona la plataforma" },
  { value: "marca", label: "Marca", description: "Gestiona campañas" },
  { value: "retail", label: "Retail", description: "Gestiona inventario" },
];

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userType, setUserType] = useState<UserType>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userType) {
      setError("Selecciona un tipo de usuario.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, email, password, userType }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "No se pudo crear la cuenta.");
        return;
      }

      router.push("/login");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="layout-register-main">
      <div className="layout-register-form-side">
        <Link href="/" className="layout-register-logo">
          <Image
            src="/logo_AndesML.png"
            alt="AndesML"
            height={32}
            width={148}
            style={{ width: "auto", height: "32px" }}
            priority
          />
        </Link>

        <div className="layout-register-card">
          <div className="layout-register-header">
            <h1 className="layout-register-title">Crea tu cuenta</h1>
            <p className="layout-register-subtitle">
              Ingresa tu información y empieza a crecer con tu negocio.
            </p>
          </div>

          <form className="layout-register-form" onSubmit={handleSubmit}>
            <div className="layout-register-row">
              <div className="layout-register-field">
                <label className="layout-register-label">
                  Nombre<span className="layout-register-label-required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nombre"
                  className="layout-register-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="layout-register-field">
                <label className="layout-register-label">
                  Apellidos<span className="layout-register-label-required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Apellidos"
                  className="layout-register-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="layout-register-field">
              <label className="layout-register-label">
                Tipo de usuario<span className="layout-register-label-required">*</span>
              </label>
              <div className="layout-register-usertype-row">
                {USER_TYPES.map(({ value, label, description }) => (
                  <button
                    key={value}
                    type="button"
                    className={`layout-register-usertype-card${userType === value ? " layout-register-usertype-card--selected" : ""}`}
                    onClick={() => setUserType(value)}
                  >
                    <span className="layout-register-usertype-label">{label}</span>
                    <span className="layout-register-usertype-desc">{description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="layout-register-field">
              <label className="layout-register-label">
                Email<span className="layout-register-label-required">*</span>
              </label>
              <input
                type="email"
                placeholder="Email"
                className="layout-register-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="layout-register-field">
              <label className="layout-register-label">
                Contraseña<span className="layout-register-label-required">*</span>
              </label>
              <div className="layout-register-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  className="layout-register-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="layout-register-eye" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword
                    ? <img src="/eye-show.svg" alt="ocultar" width="20" height="20" />
                    : <img src="/eye-off.svg" alt="mostrar" width="20" height="20" />}
                </button>
              </div>
            </div>

            <div className="layout-register-field">
              <label className="layout-register-label">
                Confirma la contraseña<span className="layout-register-label-required">*</span>
              </label>
              <div className="layout-register-input-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Contraseña"
                  className="layout-register-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button type="button" className="layout-register-eye" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm
                    ? <img src="/eye-show.svg" alt="ocultar" width="20" height="20" />
                    : <img src="/eye-off.svg" alt="mostrar" width="20" height="20" />}
                </button>
              </div>
            </div>

            <div className="layout-register-captcha">
              <div className="layout-register-captcha-left">
                <input type="checkbox" className="layout-register-captcha-checkbox" />
                <span className="layout-register-captcha-text">No soy un robot</span>
              </div>
              <div className="layout-register-captcha-brand">
                <span className="layout-register-captcha-logo">🔒</span>
                <span className="layout-register-captcha-name">reCAPTCHA</span>
              </div>
            </div>

            <label className="layout-register-terms">
              <input type="checkbox" className="layout-register-terms-checkbox" required />
              I agree to the{" "}
              <Link href="#" className="layout-register-terms-link">Terms &amp; Conditions.</Link>
            </label>

            {error && <p className="layout-login-error">{error}</p>}

            <button type="submit" className="layout-register-btn" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear mi cuenta"}
            </button>
          </form>

          <p className="layout-register-footer">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="layout-register-footer-link">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>

      <div className="layout-register-promo-side">
        <div className="layout-register-promo-content">
          <h2 className="layout-register-promo-title">
            La Plataforma de<br />retail media
          </h2>
          <p className="layout-register-promo-subtitle">
            Desde LATAM al mundo.
          </p>
        </div>
      </div>
    </main>
  );
}
