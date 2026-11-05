
import { useMemo, useState } from "react";
import "./VirtualScreening.css";

const compounds = [
  { name: "Compound A", target: "EGFR", score: 0.87 },
  { name: "Compound B", target: "JAK2", score: 0.72 },
  { name: "Compound C", target: "EGFR", score: 0.64 },
  { name: "Compound D", target: "BRAF", score: 0.91 },
  { name: "Compound E", target: "JAK2", score: 0.43 },
];

export default function VirtualScreening({ onSave }) {
  const [search, setSearch] = useState("");
  const [minimumScore, setMinimumScore] = useState("0");
  const [selected, setSelected] = useState([]);
  const [success, setSuccess] = useState("");

  const filteredCompounds = useMemo(() => {
    return compounds.filter((compound) => {
      const matchesSearch =
        compound.name.toLowerCase().includes(search.toLowerCase()) ||
        compound.target.toLowerCase().includes(search.toLowerCase());

      return matchesSearch && compound.score >= Number(minimumScore);
    });
  }, [search, minimumScore]);

  const toggleSelection = (compound) => {
    setSuccess("");

    setSelected((previous) =>
      previous.some((item) => item.name === compound.name)
        ? previous.filter((item) => item.name !== compound.name)
        : [...previous, compound]
    );
  };

  const exportCSV = () => {
    if (filteredCompounds.length === 0) return;

    const escapeCSV = (value) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const rows = [
      ["Compound", "Target", "Demo Score"],
      ...filteredCompounds.map((item) => [
        item.name,
        item.target,
        item.score,
      ]),
    ];

    const csv = rows
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "tatvalab-screening-demo.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const saveSelection = () => {
    selected.forEach((compound) =>
      onSave({
        ...compound,
        compoundName: compound.name,
        name: compound.name,
        type: "Virtual screening demo",
      })
    );

    setSelected([]);
    setSuccess("Selected compounds saved to Prediction History.");
  };

  return (
    <section className="page-section tatva-screening">
      <div className="section-heading tatva-screening-heading">
        <span className="tatva-screening-eyebrow">COMPOUND PRIORITIZATION</span>
        <h2>Virtual Screening</h2>
        <p>
          Explore and prioritize potential drug candidates using
          illustrative biological activity scores.
        </p>
      </div>

      <div className="tatva-screening-intro">
        <div className="tatva-screening-intro-icon">⌬</div>
        <div>
          <h3>Discover promising compounds</h3>
          <p>
            Virtual screening helps narrow down large compound libraries
            by evaluating and ranking candidates based on selected
            biological and molecular criteria.
          </p>
        </div>
      </div>

      <div className="tatva-screening-stats">
        <div className="tatva-screening-stat">
          <span>Total compounds</span>
          <strong>{compounds.length}</strong>
          <small>Available in demo dataset</small>
        </div>

        <div className="tatva-screening-stat">
          <span>Matching compounds</span>
          <strong>{filteredCompounds.length}</strong>
          <small>Based on current filters</small>
        </div>

        <div className="tatva-screening-stat">
          <span>Selected compounds</span>
          <strong>{selected.length}</strong>
          <small>Ready to save</small>
        </div>
      </div>

      <div className="tatva-screening-panel">
        <div className="tatva-screening-panel-header">
          <div>
            <span className="tatva-screening-eyebrow">SCREENING RESULTS</span>
            <h3>Compound library</h3>
            <p>Search, filter and select compounds for further review.</p>
          </div>

          <span className="tatva-screening-count">
            {filteredCompounds.length} results
          </span>
        </div>

        <div className="tatva-screening-controls">
          <div className="tatva-screening-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by compound or target..."
              aria-label="Search compounds"
            />
          </div>

          <div className="tatva-screening-filter">
            <label htmlFor="minimumScore">Minimum score</label>
            <select
              id="minimumScore"
              value={minimumScore}
              onChange={(event) => setMinimumScore(event.target.value)}
            >
              <option value="0">All scores</option>
              <option value="0.5">0.50 and above</option>
              <option value="0.7">0.70 and above</option>
              <option value="0.8">0.80 and above</option>
            </select>
          </div>

          <button
            type="button"
            className="tatva-export-button"
            onClick={exportCSV}
            disabled={filteredCompounds.length === 0}
          >
            <span>↓</span> Export CSV
          </button>
        </div>

        <div className="tatva-screening-table-wrap">
          <table className="tatva-screening-table">
            <thead>
              <tr>
                <th className="tatva-select-column">Select</th>
                <th>Compound</th>
                <th>Biological target</th>
                <th>Demo score</th>
                <th>Score level</th>
              </tr>
            </thead>

            <tbody>
              {filteredCompounds.map((compound) => {
                const isSelected = selected.some(
                  (item) => item.name === compound.name
                );

                return (
                  <tr
                    key={compound.name}
                    className={isSelected ? "tatva-row-selected" : ""}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(compound)}
                        aria-label={`Select ${compound.name}`}
                      />
                    </td>

                    <td className="tatva-compound-name">
                      {compound.name}
                    </td>

                    <td>
                      <span className="tatva-target-tag">
                        {compound.target}
                      </span>
                    </td>

                    <td className="tatva-score-value">
                      {compound.score.toFixed(2)}
                    </td>

                    <td>
                      <span
                        className={`tatva-score-badge ${
                          compound.score >= 0.8
                            ? "high"
                            : compound.score >= 0.5
                            ? "moderate"
                            : "low"
                        }`}
                      >
                        {compound.score >= 0.8
                          ? "High"
                          : compound.score >= 0.5
                          ? "Moderate"
                          : "Low"}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredCompounds.length === 0 && (
                <tr>
                  <td colSpan="5" className="tatva-no-results">
                    No matching compounds found. Try changing your search
                    or score filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="tatva-screening-footer">
          <span>
            {selected.length} compound{selected.length === 1 ? "" : "s"} selected
          </span>

          <button
            type="button"
            className="tatva-screening-save"
            onClick={saveSelection}
            disabled={selected.length === 0}
          >
            Save Selected <span>({selected.length})</span>
          </button>
        </div>

        {success && (
          <p className="tatva-screening-success" role="status">
            {success}
          </p>
        )}
      </div>

      <p className="tatva-screening-disclaimer">
        All compounds and scores shown here are illustrative sample data.
        They are not actual predictions from a trained machine learning model.
      </p>
    </section>
  );
}
