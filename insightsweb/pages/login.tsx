import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);

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

          <form className="layout-login-form">
            <div className="layout-login-field">
              <label className="layout-login-label">Email</label>
              <input
                type="email"
                placeholder="nombre@empresa.com"
                className="layout-login-input"
              />
            </div>

            <div className="layout-login-field">
              <label className="layout-login-label">Contraseña</label>
              <div className="layout-login-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  className="layout-login-input"
                />
                <button
                  type="button"
                  className="layout-login-eye"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="layout-login-btn">
              Iniciar sesión
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
