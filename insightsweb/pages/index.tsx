import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function Landing() {
  return (
    <>
      <Navbar />

      <main className="layout-landing-main">
        <section className="layout-landing">
          <div className="layout-landing-container">
            <div className="layout-landing-left">
              <h1 className="layout-landing-title">
                La plataforma de
                <br />
                <span className="layout-landing-title-highlight">
                  Retail Media
                </span>
                <br />
                de Latam al mundo
              </h1>
            </div>

            <div className="layout-landing-right">
              <p className="layout-landing-desc">
                Convierte cada visita en ingresos. Automatiza, monetiza y escala
                tu negocio de Retail Media con Insights de AndesML.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
