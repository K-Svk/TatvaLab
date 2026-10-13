
import { useMemo, useState } from "react";

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

  const filteredCompounds = useMemo(() => {
    return compounds.filter((compound) => {
      const matchesSearch =
        compound.name.toLowerCase().includes(search.toLowerCase()) ||
        compound.target.toLowerCase().includes(search.toLowerCase());

      return matchesSearch && compound.score >= Number(minimumScore);
    });
  }, [search, minimumScore]);

  const toggleSelection = (compound) => {
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

    const csv = rows.map((row) => row.map(escapeCSV).join(",")).join("\n");
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
  };

  return (
    <section className="page-section">
      <div className="section-heading">
        <h2>Virtual Screening</h2>
        <p>Filter and review illustrative compound candidates.</p>
      </div>

      <div className="screening-controls">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search compound or target..."
          aria-label="Search compounds"
        />

        <label>
          Minimum demo score
          <select
            value={minimumScore}
            onChange={(event) => setMinimumScore(event.target.value)}
          >
            <option value="0">All scores</option>
            <option value="0.5">0.50 and above</option>
            <option value="0.7">0.70 and above</option>
            <option value="0.8">0.80 and above</option>
          </select>
        </label>

        <button type="button" onClick={exportCSV}>
          Export CSV
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Select</th>
              <th>Compound</th>
              <th>Target</th>
              <th>Demo score</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompounds.map((compound) => (
              <tr key={compound.name}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.some(
                      (item) => item.name === compound.name
                    )}
                    onChange={() => toggleSelection(compound)}
                    aria-label={`Select ${compound.name}`}
                  />
                </td>
                <td>{compound.name}</td>
                <td>{compound.target}</td>
                <td>{compound.score.toFixed(2)}</td>
              </tr>
            ))}

            {filteredCompounds.length === 0 && (
              <tr>
                <td colSpan="4">No matching compounds found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={saveSelection}
        disabled={selected.length === 0}
      >
        Save Selected ({selected.length})
      </button>

      <p className="helper-text">
        Sample data and scores are illustrative and are not actual model
        predictions.
      </p>
    </section>
  );
}
