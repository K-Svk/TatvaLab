import { useEffect, useState } from "react";
import api from "../services/api";

export default function History({ history = [] }) {
  const [dbRecords, setDbRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mongoConnected, setMongoConnected] = useState(false);
  const [error, setError] = useState("");

  const fetchDbHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getPredictions(100);
      if (res && res.data) {
        setDbRecords(res.data);
        setMongoConnected(res.mongodb_connected);
      }
    } catch (err) {
      console.warn("Could not fetch predictions from MongoDB:", err.message);
      setError("Could not reach backend or MongoDB Atlas. Displaying session history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbHistory();
  }, []);

  // Merge database records with session history (avoiding duplicate IDs)
  const combined = [...dbRecords];
  const seenIds = new Set(dbRecords.map((r) => r.id || r._id));

  for (const item of history) {
    if (!seenIds.has(item.id)) {
      combined.push({
        id: item.id,
        compound_name: item.compoundName || item.name || "Compound",
        original_smiles: item.smiles || "—",
        canonical_smiles: item.smiles || "—",
        target_protein: item.target || "EGFR",
        target_chembl_id: "CHEMBL203",
        predicted_pchembl_value: typeof item.pchembl === "number" ? item.pchembl : Number(item.score) || 0,
        model_name: item.model || "Random Forest",
        created_at: item.createdAt || "Just now",
        isSessionOnly: !item.savedToDb,
      });
      seenIds.add(item.id);
    }
  }

  return (
    <section className="page-section">
      <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#668873", letterSpacing: "1px" }}>
            DATABASE PERSISTENCE
          </span>
          <h2>Prediction History</h2>
          <p>
            Review all EGFR bioactivity predictions saved to MongoDB Atlas and generated during active sessions.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span
            style={{
              fontSize: "11px",
              padding: "5px 10px",
              borderRadius: "15px",
              background: mongoConnected ? "#e3f5e7" : "#fbf2e5",
              color: mongoConnected ? "#1c6832" : "#995c1c",
              fontWeight: "600",
            }}
          >
            {mongoConnected ? "● MongoDB Connected" : "○ MongoDB Standby / Session"}
          </span>

          <button
            type="button"
            className="secondary-button"
            onClick={fetchDbHistory}
            disabled={loading}
            style={{ fontSize: "12px", padding: "6px 12px" }}
          >
            {loading ? "Refreshing..." : "↻ Refresh History"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "#fdf6f5", color: "#a84545", borderRadius: "8px", fontSize: "12px", marginBottom: "15px", border: "1px solid #f0dada" }}>
          ⓘ {error}
        </div>
      )}

      {combined.length === 0 ? (
        <div className="empty-state" style={{ textAlign: "center", padding: "40px", background: "#ffffff", borderRadius: "12px", border: "1px solid #e7ece5" }}>
          <div style={{ fontSize: "32px", color: "#72927a", marginBottom: "10px" }}>⌬</div>
          <h3 style={{ color: "#173d2d", margin: "0 0 6px" }}>No prediction records yet</h3>
          <p style={{ color: "#78877c", fontSize: "13px" }}>
            Run a prediction in the "Predict Activity" tab or save candidates from "Virtual Screening" to persist records.
          </p>
        </div>
      ) : (
        <div className="table-wrapper" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e7ece5", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f9faf8", borderBottom: "1px solid #e5ebe5", color: "#546b5b", fontSize: "11px" }}>
                <th style={{ padding: "12px 14px" }}>COMPOUND</th>
                <th style={{ padding: "12px 14px" }}>SMILES</th>
                <th style={{ padding: "12px 14px" }}>TARGET</th>
                <th style={{ padding: "12px 14px" }}>PREDICTED pChEMBL</th>
                <th style={{ padding: "12px 14px" }}>MODEL</th>
                <th style={{ padding: "12px 14px" }}>STORAGE</th>
                <th style={{ padding: "12px 14px" }}>RECORDED</th>
              </tr>
            </thead>
            <tbody>
              {combined.map((entry) => {
                const pval = Number(entry.predicted_pchembl_value || entry.pchembl || entry.score || 0);
                const isHigh = pval >= 7.0;

                return (
                  <tr key={entry.id || entry._id} style={{ borderBottom: "1px solid #edf2ec" }}>
                    <td style={{ padding: "12px 14px", fontWeight: "650", color: "#173d2d" }}>
                      {entry.compound_name || entry.compoundName || entry.name || "Compound"}
                    </td>

                    <td style={{ padding: "12px 14px", color: "#78877c", maxWidth: "200px" }}>
                      <span
                        style={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontFamily: "monospace",
                          fontSize: "11px",
                        }}
                        title={entry.canonical_smiles || entry.original_smiles || entry.smiles}
                      >
                        {entry.canonical_smiles || entry.original_smiles || entry.smiles || "—"}
                      </span>
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "3px 7px", background: "#edf4ee", color: "#2e5d3c", borderRadius: "6px", fontSize: "11px", fontWeight: "600" }}>
                        {entry.target_protein || entry.target || "EGFR"}
                      </span>
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <strong style={{ color: isHigh ? "#17632e" : "#2a4d37" }}>
                        {pval > 0 ? pval.toFixed(4) : "—"}
                      </strong>
                    </td>

                    <td style={{ padding: "12px 14px", color: "#5a7061", fontSize: "12px" }}>
                      {entry.model_name || entry.model || "Random Forest"}
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      {entry.isSessionOnly ? (
                        <span style={{ fontSize: "11px", color: "#995c1c" }}>Session Memory</span>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#1c6832", fontWeight: "600" }}>
                          ✓ Atlas DB ({String(entry.id || entry._id).slice(-6)})
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "12px 14px", color: "#8a968d", fontSize: "11px" }}>
                      {entry.created_at ? new Date(entry.created_at).toLocaleString() : entry.createdAt || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
