"use client";
import Link from "next/link";
import Image from "next/image";
import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <nav className={styles["layout-navbar-landing"]}>
      <div className={styles["layout-navbar-container"]}>
        <Link href="/" className={styles["layout-navbar-logo"]}>
          <Image
            src="/logo_AndesML.png"
            alt="AndesML"
            height={36}
            width={150}
            priority
          />
        </Link>

        <div className={styles["layout-navbar-right"]}>
          <div className={styles["layout-navbar-links"]}>
            <Link href="#" className={styles["layout-navbar-link"]}>
              Sobre Insights
            </Link>
          </div>

          <div className={styles["layout-navbar-actions"]}>
            <Link href="/login" className={styles["layout-navbar-btn-ingresar"]}>
              Ingresar
            </Link>
            <Link href="/register" className={styles["layout-navbar-btn-comenzar"]}>
              Comenzar hoy
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
