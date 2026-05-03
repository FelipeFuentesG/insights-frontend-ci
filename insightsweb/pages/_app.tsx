import type { AppProps } from "next/app";
import { Geist } from "next/font/google";
import "../styles/landing.css";
import "../styles/login.css";
import "../styles/register.css";
import "../styles/home.css";
import "../styles/idProducto.css";
import "../styles/productos.css";  
import "../components/Sidebar.css";

const geistSans = Geist({ subsets: ["latin"] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={geistSans.className}>
      <Component {...pageProps} />
    </div>
  );
}
