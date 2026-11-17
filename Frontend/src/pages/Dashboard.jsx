import { useEffect, useState } from "react";
import api from "../services/api";
import { stats as fallbackStats, compounds as fallbackCompounds } from "../data/mockData";

export default function Dashboard({ history = [], onNavigate }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [dbHistory, setDbHistory] = useState([]);
  const [isBackendOnline, setIsBackendOnline] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const [statsRes, historyRes] = await Promise.all([
          api.getDashboardStats().catch(() => null),
          api.getPredictions(5).catch(() => null),
        ]);

        if (isMounted) {
          if (statsRes) {
            setDashboardData(statsRes);
            setIsBackendOnline(true);
          }
          if (historyRes && Array.isArray(historyRes.data) && historyRes.data.length > 0) {
            setDbHistory(historyRes.data);
          }
        }
      } catch (err) {
        console.warn("Backend not reachable for dashboard stats:", err);
      }
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute stats to display
  const statsList = [
    {
      label: "Target Protein",
      value: "EGFR (CHEMBL203)",
      change: "Active target",
      icon: "⌬",
    },
    {
      label: "Benchmark Dataset",
      value: "2,000",
      change: "Valid compounds",
      icon: "◎",
    },
    {
      label: "Best Model (R²)",
      value: "0.5468",
      change: "Random Forest (MAE: 0.572)",
      icon: "▤",
    },
    {
      label: "Database Predictions",
      value: String(
        dashboardData?.saved_predictions ||
          (history.length > 0 ? history.length : 0)
      ),
      change: dashboardData?.mongodb_connected
        ? "Atlas Connected"
        : "Session Tracking",
      icon: "↗",
    },
  ];

  // Table items: either from DB, from prop history, or default reference compounds
  let displayCompounds = [];

  if (dbHistory.length > 0) {
    displayCompounds = dbHistory.map((item) => ({
      id: item.id || item._id || "CMP",
      name: item.compound_name || "Compound",
      target: item.target_protein || "EGFR",
      score: item.predicted_pchembl_value ? Math.min(1, Math.max(0, (item.predicted_pchembl_value - 4) / 6)) : 0.75,
      rawScore: item.predicted_pchembl_value,
    }));
  } else if (history.length > 0) {
    displayCompounds = history.slice(0, 5).map((item) => ({
      id: item.id || "CMP",
      name: item.compoundName || item.name || "Compound",
      target: item.target || "EGFR (CHEMBL203)",
      score: typeof item.pchembl === "number"
        ? Math.min(1, Math.max(0, (item.pchembl - 4) / 6))
        : Number(item.score) || 0.7,
      rawScore: item.pchembl || item.score,
    }));
  } else {
    displayCompounds = [
      { id: "CHEMBL1079742", name: "EGFR Inhibitor Hit 1", target: "EGFR", score: 0.87, rawScore: 8.70 },
      { id: "CHEMBL1765447", name: "Gefitinib Derivative", target: "EGFR", score: 0.79, rawScore: 7.74 },
      { id: "CHEMBL2178229", name: "Quinazoline Candidate", target: "EGFR", score: 0.71, rawScore: 7.26 },
      { id: "CHEMBL10", name: "Low Affinity Molecule", target: "EGFR", score: 0.35, rawScore: 5.00 },
      { id: "CHEMBL1095259", name: "Inactive Control", target: "EGFR", score: 0.22, rawScore: 4.35 },
    ];
  }

  return (
    <div className="dashboard-page">
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">TATVALAB · ML-BASED DRUG DISCOVERY</span>
          <h2>Accelerate EGFR Inhibitor Discovery<br />with Machine Learning</h2>
          <p>
            TatvaLab integrates RDKit molecular featurization, high-performance Random Forest
            prediction models, and MongoDB Atlas for rapid bioactivity screening and candidate evaluation.
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
            <button className="primary-button" onClick={() => onNavigate("predict")}>
              Predict Compound Activity <span>→</span>
            </button>
            <button className="secondary-button" onClick={() => onNavigate("screening")}>
              Virtual Screening <span>⚗</span>
            </button>
          </div>
        </div>
        <div className="welcome-art" aria-hidden="true">⌬</div>
      </section>

      <section className="stats-grid">
        {statsList.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <div className="stat-card-top">
              <span className="stat-number-icon">{stat.icon}</span>
              <span className="stat-change">{stat.change}</span>
            </div>
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="panel compounds-panel">
        <div className="panel-heading">
          <div>
            <h3>Recent EGFR Candidates & Predictions</h3>
            <p>Candidate compounds and recent bioactivity assessments</p>
          </div>
          <button className="secondary-button" onClick={() => onNavigate("predict")}>
            New Prediction +
          </button>
        </div>

        <div className="table-wrap">
          <table className="compound-table">
            <thead>
              <tr>
                <th>COMPOUND</th>
                <th>TARGET</th>
                <th>PREDICTED pChEMBL / POTENCY</th>
                <th>CLASSIFICATION</th>
              </tr>
            </thead>
            <tbody>
              {displayCompounds.map((item) => {
                const pchembl = typeof item.rawScore === "number" ? item.rawScore : item.score * 10;
                const isHigh = pchembl >= 7.0 || item.score >= 0.7;
                const isModerate = pchembl >= 6.0 || item.score >= 0.5;

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <span className="table-subtitle">{String(item.id).slice(-12)}</span>
                    </td>
                    <td>{item.target}</td>
                    <td>
                      <div className="score-cell">
                        <div className="score-track">
                          <span style={{ width: `${Math.round(item.score * 100)}%` }} />
                        </div>
                        <span style={{ fontWeight: "600", fontSize: "12px" }}>
                          {typeof item.rawScore === "number" ? item.rawScore.toFixed(2) : `${Math.round(item.score * 100)}%`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          isHigh ? "status-high" : isModerate ? "status-review" : "status-low"
                        }`}
                      >
                        {isHigh ? "High Potency" : isModerate ? "Moderate" : "Low Potency"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="demo-note">
        Target: Human EGFR (CHEMBL203). Bioactivity values represented on the standard pChEMBL scale [-log10(IC50 M)].
      </p>
    </div>
  );
}
