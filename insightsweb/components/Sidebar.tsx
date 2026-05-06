import { useState } from "react";
import { useRouter } from "next/router";

type NavItem = {
  label: string;
  imgSrc: string;
  href?: string;
  active?: boolean;
  chevron?: boolean;
  children?: { label: string; href: string }[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", imgSrc: "/home.svg", href: "/home" },
  { label: "Campañas", imgSrc: "/campaign.svg" },
  {
    label: "Tableros",
    imgSrc: "/table.svg",
    chevron: true,
    children: [
      { label: "Dashboard de Productos", href: "/productos" },
      { label: "Dashboard Ventas Totales", href: "/ventas" },
    ],
  },
  { label: "Insights", imgSrc: "/bulb.svg", href: "/home" },
  { label: "Pagos y Facturas", imgSrc: "/money.svg", chevron: true },
  { label: "Gestionar Socio", imgSrc: "/bag.svg" },
];

export default function Sidebar() {
  const router = useRouter();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    Tableros: true, // abierto por defecto si estás en /productos
  });

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href?: string) =>
    href ? router.pathname === href || router.pathname.startsWith(href + "/") : false;

  return (
    <aside className="home-sidebar">
      <div className="home-sidebar-logo">
        <div className="home-sidebar-logo-badge">ML</div>
        <span className="home-sidebar-logo-text">Andes ML</span>
      </div>

      <nav className="home-sidebar-nav">
        {NAV_ITEMS.map(({ label, imgSrc, href, chevron, children }) => {
          const active = isActive(href) || (children?.some((c) => isActive(c.href)) ?? false);
          const open = openMenus[label] ?? false;

          return (
            <div key={label}>
              <button
                className={`home-sidebar-item${active && !children ? " active" : ""}`}
                onClick={() => {
                  if (children) {
                    toggleMenu(label);
                  } else if (href) {
                    router.push(href);
                  }
                }}
              >
                <img
                  src={imgSrc}
                  alt=""
                  width="16"
                  height="16"
                  className="home-sidebar-nav-img"
                />
                {label}
                {chevron && (
                  <img
                    src="/chevron.svg"
                    alt=""
                    width="14"
                    height="14"
                    className="home-sidebar-chevron"
                    style={{
                      transform: open ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                )}
              </button>

              {/* Submenú */}
              {children && open && (
                <div className="home-sidebar-submenu">
                  {children.map((child) => (
                    <button
                      key={child.href}
                      className={`home-sidebar-subitem${isActive(child.href) ? " active" : ""}`}
                      onClick={() => router.push(child.href)}
                    >
                      <span className="home-sidebar-subitem-dot" />
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="home-sidebar-footer">
        <img
          src="/logo_AndesML_blanco.png"
          alt="Andes ML"
          className="home-sidebar-footer-logo"
        />
      </div>
    </aside>
  );
}
