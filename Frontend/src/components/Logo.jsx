
export default function Logo({ collapsed = false }) {
  return (
    <div className={`brand-logo ${collapsed ? "brand-logo-collapsed" : ""}`}>
      <svg
        className="brand-icon"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="TatvaLab molecular logo"
        role="img"
      >
        <path
          d="M14 13L25 8L36 14L36 26L25 32L14 26Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M14 26L7 35M36 14L42 7M36 26L42 35"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="25" cy="8" r="4" fill="#69A982" />
        <circle cx="42" cy="7" r="4" fill="#69A982" />
        <circle cx="7" cy="35" r="4" fill="#69A982" />
        <circle cx="42" cy="35" r="4" fill="#69A982" />
        <circle cx="25" cy="20" r="4" fill="#2D7656" />
        <path
          d="M25 24V29"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {!collapsed && (
        <span className="brand-name">
          Tatva<span>Lab</span>
        </span>
      )}
    </div>
  );
}
