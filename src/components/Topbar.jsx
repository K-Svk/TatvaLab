
import { useState } from "react";

export default function Topbar({ title, subtitle }) {
  const [query, setQuery] = useState("");

  const handleSearch = (event) => {
    event.preventDefault();

    const searchQuery = query.trim();

    if (!searchQuery) return;

    const elements = document.querySelectorAll(
      ".page-content h1, .page-content h2, .page-content h3, .page-content p, .page-content td, .page-content th, .page-content label, .page-content button"
    );

    let match = null;

    for (const element of elements) {
      if (
        element.textContent
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        match = element;
        break;
      }
    }

    if (match) {
      match.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      match.focus?.({ preventScroll: true });
    } else {
      window.alert(`No visible match found for "${searchQuery}".`);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-heading">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <form className="topbar-search" onSubmit={handleSearch}>
        <span aria-hidden="true">⌕</span>

        <input
          type="search"
          placeholder="Search this page..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search current page"
        />

        <button type="submit" aria-label="Search">
          Search
        </button>
      </form>
    </header>
  );
}
