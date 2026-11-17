
import Logo from "./Logo";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "predict", label: "Predict Activity", icon: "◉" },
  { id: "screening", label: "Virtual Screening", icon: "⚗" },
  { id: "performance", label: "Model Performance", icon: "▥" },
  { id: "history", label: "Prediction History", icon: "◷" },
];

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Logo />
      </div>

      <div className="sidebar-section-label">WORKSPACE</div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${
              activePage === item.id ? "active" : ""
            }`}
            onClick={() => onNavigate(item.id)}
            aria-current={activePage === item.id ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-status-dot" />
        <div>
          <div className="sidebar-status-title">
            Research workspace
          </div>
          <div className="sidebar-status-subtitle">
            Demo environment
          </div>
        </div>
      </div>
    </aside>
  );
}
