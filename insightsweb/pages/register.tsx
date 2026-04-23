import Image from "next/image";
import Link from "next/link";
import { useState } from "react";


const USER_TYPES = [
  { value: "marca", label: "Marca" },
  { value: "admin", label: "Admin" },
  { value: "retail", label: "Retail" },
];

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userType, setUserType] = useState("");

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

          <form className="layout-register-form">
            <div className="layout-register-row">
              <div className="layout-register-field">
                <label className="layout-register-label">
                  Nombre<span className="layout-register-label-required">*</span>
                </label>
                <input type="text" placeholder="Nombre" className="layout-register-input" />
              </div>
              <div className="layout-register-field">
                <label className="layout-register-label">
                  Apellidos<span className="layout-register-label-required">*</span>
                </label>
                <input type="text" placeholder="Apellidos" className="layout-register-input" />
              </div>
            </div>

            <div className="layout-register-field">
              <label className="layout-register-label">
                Email<span className="layout-register-label-required">*</span>
              </label>
              <input type="email" placeholder="Email" className="layout-register-input" />
            </div>

            <div className="layout-register-field">
              <label className="layout-register-label">
                Tipo de usuario<span className="layout-register-label-required">*</span>
              </label>
              <div className="layout-register-user-type-group">
                {USER_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className={`layout-register-user-type-btn${userType === type.value ? " layout-register-user-type-btn--active" : ""}`}
                    onClick={() => setUserType(type.value)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
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
                />
                <button type="button" className="layout-register-eye" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <img src="/eye-show.svg" alt="ocultar" width="20" height="20" /> : <img src="/eye-off.svg" alt="mostrar" width="20" height="20" />}
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
                />
                <button type="button" className="layout-register-eye" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <img src="/eye-show.svg" alt="ocultar" width="20" height="20" /> : <img src="/eye-off.svg" alt="mostrar" width="20" height="20" />}
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
              <input type="checkbox" className="layout-register-terms-checkbox" />
              I agree to the{" "}
              <Link href="#" className="layout-register-terms-link">Terms &amp; Conditions.</Link>
            </label>

            <button type="submit" className="layout-register-btn">
              Crear mi cuenta
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
