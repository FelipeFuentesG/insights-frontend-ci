import type { AppProps } from "next/app";
import { Geist } from "next/font/google";
import "../styles/landing.css";
import "../styles/login.css";
import "../styles/home.css";
import "../styles/idProducto.css";
import "../styles/productos.css";  
import "../styles/rendimiento.css";
import "../styles/segmentos.css";
import "../components/Sidebar.css";
import "../components/IndicadoresTab.css";
import "../components/InteraccionesTab.css";
import "../components/InsightsChat.css";
import InsightsFloatingWidget from "../components/InsightsFloatingWidget";

const geistSans = Geist({ subsets: ["latin"] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={geistSans.className}>
      <Component {...pageProps} />
      <InsightsFloatingWidget />
    </div>
  );
}
