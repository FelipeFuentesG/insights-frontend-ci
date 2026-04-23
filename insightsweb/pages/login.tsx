import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

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
                  {showPassword ? <img src="/eye-show.svg" alt="ocultar" width="20" height="20" /> : <img src="/eye-off.svg" alt="mostrar" width="20" height="20" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              className="layout-login-btn"
              onClick={() => router.push("/home")}
            >
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
