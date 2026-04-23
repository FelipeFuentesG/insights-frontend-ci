"use client";
import Link from "next/link";
import Image from "next/image";
import "./Navbar.css";

export default function Navbar() {
  return (
    <nav className="layout-navbar-landing">
      <div className="layout-navbar-container">
        <Link href="/" className="layout-navbar-logo">
          <Image
            src="/logo_AndesML.png"
            alt="AndesML"
            height={36}
            width={150}
            style={{ width: "auto", height: "36px" }}
            priority
          />
        </Link>

        <div className="layout-navbar-right">
          <div className="layout-navbar-links">
            {["Características", "Dashboards", "Sobre Insights"].map((item) => (
              <Link key={item} href="#" className="layout-navbar-link">
                {item}
              </Link>
            ))}
          </div>

          <div className="layout-navbar-actions">
            <Link href="/login" className="layout-navbar-btn-ingresar">
              Ingresar
            </Link>
            <Link href="/register" className="layout-navbar-btn-comenzar">
              Comenzar hoy
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
