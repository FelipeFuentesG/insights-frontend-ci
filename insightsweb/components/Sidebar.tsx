import "./Sidebar.css";

type NavItem = {
  label: string;
  imgSrc: string;
  active?: boolean;
  chevron?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", imgSrc: "/home.svg" },
  { label: "Campañas", imgSrc: "/campaign.svg" },
  { label: "Tableros", imgSrc: "/table.svg", chevron: true },
  { label: "Insights", imgSrc: "/bulb.svg", active: true },
  { label: "Pagos y Facturas", imgSrc: "/money.svg", chevron: true },
  { label: "Gestionar Socio", imgSrc: "/bag.svg" },
];

export default function Sidebar() {
  return (
    <aside className="home-sidebar">
      <div className="home-sidebar-logo">
        <div className="home-sidebar-logo-badge">ML</div>
        <span className="home-sidebar-logo-text">Andes ML</span>
      </div>
      <nav className="home-sidebar-nav">
        {NAV_ITEMS.map(({ label, imgSrc, active, chevron }) => (
          <button key={label} className={`home-sidebar-item${active ? " active" : ""}`}>
            <img src={imgSrc} alt="" width="16" height="16" className="home-sidebar-nav-img" />
            {label}
            {chevron && (
              <img src="/chevron.svg" alt="" width="14" height="14" className="home-sidebar-chevron" />
            )}
          </button>
        ))}
      </nav>
      <div className="home-sidebar-footer">
        <img src="/logo_AndesML_blanco.png" alt="Andes ML" className="home-sidebar-footer-logo" />
      </div>
    </aside>
  );
}
