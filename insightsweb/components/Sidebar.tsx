import { useState, useEffect } from "react";
import { useRouter } from "next/router";

type Rol = "admin_global_andesml" | "admin_retailer" | "admin_marca";

type NavChild = {
  label: string;
  href?: string;
  roles?: Rol[];
};

type NavItem = {
  label: string;
  imgSrc?: string;
  href?: string;
  active?: boolean;
  chevron?: boolean;
  roles?: Rol[];
  children?: NavChild[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", imgSrc: "/home.svg", href: "/home" },
  {
    label: "Tableros",
    imgSrc: "/table.svg",
    chevron: true,
    children: [
      { label: "Dashboard de Productos", href: "/productos" },
      { label: "Dashboard de Ventas Totales", href: "/ventas" },
      { label: "Dashboard de Clientes", href: "/clientes" },
      { label: "Segmentos de Clientes", href: "/segmentos" },
      {
        label: "Dashboard Global de Retailer",
        href: "/retailer-global",
        roles: ["admin_global_andesml", "admin_retailer"],
      },
    ],
  },
  { label: "Insights", imgSrc: "/bulb.svg", href: "/insights" },
  {
    label: "Análisis de Catálogo",
    imgSrc: "/bag.svg",
    chevron: true,
    children: [
      { label: "Productos con Bajo Rendimiento", href: "/rendimiento" },
      { label: "Gaps de Rentabilidad", href: "/rendimiento/gaps-rentabilidad" },
    ],
  },
  { label: "Gestión de la Plataforma", imgSrc: "/campaign.svg", roles: ["admin_global_andesml"] },
  { label: "Estado de Carga de Datos" },
];

export default function Sidebar() {
  const router = useRouter();
  const [rol, setRol] = useState<Rol | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRol(parsed.rol ?? null);
      } catch {
        setRol(null);
      }
    }
  }, []);

  const canSee = (roles?: Rol[]) => {
    if (!roles) return true;
    if (!rol) return false;
    return roles.includes(rol);
  };

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_ITEMS.forEach((item) => {
      if (item.children?.some((c) => c.href && router.pathname.startsWith(c.href))) {
        initial[item.label] = true;
      }
    });
    return initial;
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
        {NAV_ITEMS.filter((item) => canSee(item.roles)).map(({ label, imgSrc, href, chevron, children }) => {
          const visibleChildren = children?.filter((c) => canSee(c.roles));
          const active = isActive(href) || (visibleChildren?.some((c) => isActive(c.href)) ?? false);
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
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt=""
                    width="16"
                    height="16"
                    className="home-sidebar-nav-img"
                  />
                )}
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
              {visibleChildren && open && (
                <div className="home-sidebar-submenu">
                  {visibleChildren.map((child) => (
                    <button
                      key={child.label}
                      className={`home-sidebar-subitem${isActive(child.href) ? " active" : ""}`}
                      onClick={() => { if (child.href) router.push(child.href); }}
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
