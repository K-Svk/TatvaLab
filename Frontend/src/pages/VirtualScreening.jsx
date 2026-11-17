import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./VirtualScreening.css";

// Diverse screening compound library including known EGFR inhibitors and controls
const DEFAULT_SCREENING_LIBRARY = [
  {
    name: "Gefitinib",
    target: "EGFR (CHEMBL203)",
    smiles: "COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1",
    score: 0.79,
    pchembl: 7.74,
  },
  {
    name: "Erlotinib",
    target: "EGFR (CHEMBL203)",
    smiles: "C#Cc1cccc(Nc2ncnc3cc(OCCOC)c(OCCOC)cc23)c1",
    score: 0.85,
    pchembl: 8.07,
  },
  {
    name: "Osimertinib",
    target: "EGFR (CHEMBL203)",
    smiles: "CN(C)CC=CC(=O)Nc1cc(Nc2nccc(n2)c3cn(C)c4ccccc34)c(OC)cc1N(C)CCN(C)C",
    score: 0.88,
    pchembl: 8.28,
  },
  {
    name: "Lapatinib",
    target: "EGFR (CHEMBL203)",
    smiles: "CS(=O)(=O)CCNCc1ccc(o1)c2ccc3c(c2)c(ncn3)Nc4ccc(c(c4)Cl)OCc5cccc(c5)F",
    score: 0.81,
    pchembl: 7.86,
  },
  {
    name: "Afatinib",
    target: "EGFR (CHEMBL203)",
    smiles: "CN(C)C/C=C/C(=O)Nc1cc2c(Nc3ccc(Cl)c(F)c3)ncnc2cc1O[C@H]1CCOC1",
    score: 0.83,
    pchembl: 7.98,
  },
  {
    name: "Dacomitinib",
    target: "EGFR (CHEMBL203)",
    smiles: "COc1cc2c(Nc3ccc(Cl)c(F)c3)ncnc2cc1NC(=O)/C=C/CN1CCCCC1",
    score: 0.82,
    pchembl: 7.92,
  },
  {
    name: "Aspirin (Control)",
    target: "COX-1 / Control",
    smiles: "CC(=O)Oc1ccccc1C(=O)O",
    score: 0.44,
    pchembl: 6.66,
  },
  {
    name: "Ethanol (Control)",
    target: "Control",
    smiles: "CCO",
    score: 0.44,
    pchembl: 6.66,
  },
];

export default function VirtualScreening({ onSave }) {
  const [compoundsList, setCompoundsList] = useState(DEFAULT_SCREENING_LIBRARY);
  const [search, setSearch] = useState("");
  const [minimumScore, setMinimumScore] = useState("0");
  const [selected, setSelected] = useState([]);
  const [isScreening, setIsScreening] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const runLiveScreening = async () => {
    setIsScreening(true);
    setError("");
    setSuccess("");

    try {
      const payload = compoundsList.map((c) => ({
        name: c.name,
        smiles: c.smiles,
        target: c.target,
      }));

      const res = await api.runVirtualScreening(payload, false);
      if (res && res.results) {
        setCompoundsList(
          res.results.map((r) => ({
            name: r.name,
            target: r.target,
            smiles: r.smiles,
            score: r.score,
            pchembl: r.predicted_pchembl_value,
          }))
        );
        setSuccess(`Screening complete! Ranked ${res.total_screened} compounds via Random Forest model.`);
      }
    } catch (err) {
      setError(`Backend screening request failed: ${err.message}. Using library data.`);
    } finally {
      setIsScreening(false);
    }
  };

  const filteredCompounds = useMemo(() => {
    return compoundsList.filter((compound) => {
      const matchesSearch =
        compound.name.toLowerCase().includes(search.toLowerCase()) ||
        compound.target.toLowerCase().includes(search.toLowerCase()) ||
        (compound.smiles && compound.smiles.toLowerCase().includes(search.toLowerCase()));

      return matchesSearch && (compound.score || 0) >= Number(minimumScore);
    });
  }, [compoundsList, search, minimumScore]);

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

    const escapeCSV = (value) => `"${String(value).replace(/"/g, '""')}"`;

    const rows = [
      ["Compound Name", "Target", "SMILES", "Predicted pChEMBL", "Relative Score"],
      ...filteredCompounds.map((item) => [
        item.name,
        item.target,
        item.smiles || "",
        item.pchembl || "",
        item.score || "",
      ]),
    ];

    const csv = rows.map((row) => row.map(escapeCSV).join(",")).join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "tatvalab-egfr-virtual-screening.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveSelection = async () => {
    if (selected.length === 0) return;

    let savedCount = 0;
    for (const compound of selected) {
      try {
        await api.savePrediction({
          compound_name: compound.name,
          original_smiles: compound.smiles || "N/A",
          canonical_smiles: compound.smiles || "N/A",
          predicted_pchembl_value: compound.pchembl || Number((compound.score * 10).toFixed(2)),
          target_protein: "EGFR",
          target_chembl_id: "CHEMBL203",
          model_name: "Random Forest",
        });
        savedCount++;
      } catch (err) {
        console.warn(`Could not save ${compound.name} to MongoDB:`, err.message);
      }

      if (onSave) {
        onSave({
          id: `scr-${Date.now()}-${Math.random()}`,
          compoundName: compound.name,
          name: compound.name,
          target: compound.target,
          score: compound.pchembl || compound.score,
          pchembl: compound.pchembl,
          type: "Virtual Screening Selection",
        });
      }
    }

    setSelected([]);
    setSuccess(
      savedCount > 0
        ? `Successfully saved ${savedCount} selected compounds to MongoDB Atlas and session history!`
        : `Selected compounds saved to session history!`
    );
  };

  return (
    <section className="page-section tatva-screening">
      <div className="section-heading tatva-screening-heading">
        <span className="tatva-screening-eyebrow">EGFR DISCOVERY PIPELINE</span>
        <h2>Virtual Screening Library</h2>
        <p>
          Screen small-molecule candidates against the EGFR kinase domain.
          Prioritize leads using live Morgan fingerprint generation and Random Forest inference.
        </p>
      </div>

      <div className="tatva-screening-intro">
        <div className="tatva-screening-intro-icon">⚗</div>
        <div>
          <h3>In Silico Compound Prioritization</h3>
          <p>
            Virtual screening evaluates multi-compound chemical libraries in parallel,
            predicting bioaffinity (pChEMBL) to identify potent nanomolar EGFR hits before wet-lab synthesis.
          </p>
        </div>
      </div>

      <div className="tatva-screening-stats">
        <div className="tatva-screening-stat">
          <span>Total Candidates</span>
          <strong>{compoundsList.length}</strong>
          <small>Small molecule library</small>
        </div>

        <div className="tatva-screening-stat">
          <span>Filtered Candidates</span>
          <strong>{filteredCompounds.length}</strong>
          <small>Matching search criteria</small>
        </div>

        <div className="tatva-screening-stat">
          <span>Selected for Review</span>
          <strong>{selected.length}</strong>
          <small>Ready to save</small>
        </div>
      </div>

      <div className="tatva-screening-panel">
        <div className="tatva-screening-panel-header">
          <div>
            <span className="tatva-screening-eyebrow">SCREENING CANDIDATES</span>
            <h3>EGFR Small Molecule Library</h3>
            <p>Filter candidates, trigger model re-inference, or export results.</p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              className="tatva-screening-save"
              onClick={runLiveScreening}
              disabled={isScreening}
              style={{ background: "#205239" }}
            >
              {isScreening ? "Screening with RF..." : "⚡ Run ML Batch Screening"}
            </button>
            <span className="tatva-screening-count">
              {filteredCompounds.length} compounds
            </span>
          </div>
        </div>

        <div className="tatva-screening-controls">
          <div className="tatva-screening-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by compound name, target, or SMILES..."
              aria-label="Search compounds"
            />
          </div>

          <div className="tatva-screening-filter">
            <label htmlFor="minimumScore">Minimum potency score</label>
            <select
              id="minimumScore"
              value={minimumScore}
              onChange={(event) => setMinimumScore(event.target.value)}
            >
              <option value="0">All compounds</option>
              <option value="0.5">Moderate & above (≥ 0.50)</option>
              <option value="0.7">High potency (≥ 0.70 / pChEMBL ≥ 7.0)</option>
              <option value="0.8">Exceptional hits (≥ 0.80 / pChEMBL ≥ 8.0)</option>
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

        {error && (
          <p style={{ color: "#b44c4c", fontSize: "12px", margin: "10px 0" }}>
            ⚠️ {error}
          </p>
        )}

        {success && (
          <p className="tatva-screening-success" role="status">
            ✓ {success}
          </p>
        )}

        <div className="tatva-screening-table-wrap">
          <table className="tatva-screening-table">
            <thead>
              <tr>
                <th className="tatva-select-column">Select</th>
                <th>Compound</th>
                <th>Target</th>
                <th>Predicted pChEMBL</th>
                <th>Score</th>
                <th>Activity Level</th>
              </tr>
            </thead>

            <tbody>
              {filteredCompounds.map((compound) => {
                const isSelected = selected.some(
                  (item) => item.name === compound.name
                );
                const pchemblVal = compound.pchembl || (compound.score * 10);
                const isHigh = pchemblVal >= 7.0 || compound.score >= 0.75;
                const isModerate = pchemblVal >= 6.0 || compound.score >= 0.5;

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
                      <strong>{compound.name}</strong>
                      {compound.smiles && (
                        <div style={{ fontSize: "10px", color: "#839286", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {compound.smiles}
                        </div>
                      )}
                    </td>

                    <td>
                      <span className="tatva-target-tag">
                        {compound.target}
                      </span>
                    </td>

                    <td className="tatva-score-value">
                      <strong>{typeof compound.pchembl === "number" ? compound.pchembl.toFixed(2) : (compound.score * 10).toFixed(2)}</strong>
                    </td>

                    <td className="tatva-score-value">
                      {(compound.score || 0).toFixed(2)}
                    </td>

                    <td>
                      <span
                        className={`tatva-score-badge ${
                          isHigh ? "high" : isModerate ? "moderate" : "low"
                        }`}
                      >
                        {isHigh ? "High Potency" : isModerate ? "Moderate" : "Low Potency"}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredCompounds.length === 0 && (
                <tr>
                  <td colSpan="6" className="tatva-no-results">
                    No matching compounds found. Try clearing your search query or adjusting the minimum score filter.
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
            Save Selected to Database & History <span>({selected.length})</span>
          </button>
        </div>
      </div>

      <p className="tatva-screening-disclaimer">
        Predictions calculated using Random Forest regressor trained on 2,000 post-2020 EGFR assay records.
        pChEMBL ≥ 7.0 corresponds to sub-micromolar/nanomolar EGFR inhibition.
      </p>
    </section>
  );
}
