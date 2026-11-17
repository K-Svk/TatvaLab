import { useState } from "react";
import api from "../services/api";
import "./PredictActivity.css";

const QUICK_SAMPLES = [
  {
    name: "Gefitinib",
    smiles: "COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1",
    desc: "1st gen EGFR kinase inhibitor",
  },
  {
    name: "Erlotinib",
    smiles: "C#Cc1cccc(Nc2ncnc3cc(OCCOC)c(OCCOC)cc23)c1",
    desc: "EGFR tyrosine kinase inhibitor",
  },
  {
    name: "Osimertinib",
    smiles: "CN(C)CC=CC(=O)Nc1cc(Nc2nccc(n2)c3cn(C)c4ccccc34)c(OC)cc1N(C)CCN(C)C",
    desc: "3rd gen mutant-selective EGFR inhibitor",
  },
  {
    name: "Lapatinib",
    smiles: "CS(=O)(=O)CCNCc1ccc(o1)c2ccc3c(c2)c(ncn3)Nc4ccc(c(c4)Cl)OCc5cccc(c5)F",
    desc: "Dual EGFR / HER2 inhibitor",
  },
];

export default function PredictActivity({ onSave }) {
  const [compoundName, setCompoundName] = useState("");
  const [smiles, setSmiles] = useState("");
  const [target, setTarget] = useState("EGFR (CHEMBL203)");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSelectSample = (sample) => {
    setCompoundName(sample.name);
    setSmiles(sample.smiles);
    setError("");
    setSuccess("");
    setResult(null);
  };

  const handlePredict = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setResult(null);

    const trimmedName = compoundName.trim();
    const trimmedSmiles = smiles.trim();

    if (!trimmedName) {
      setError("Please enter a compound name or identifier.");
      return;
    }

    if (!trimmedSmiles) {
      setError("Please enter a valid chemical SMILES string.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.predictActivity({
        compoundName: trimmedName,
        smiles: trimmedSmiles,
        targetProtein: "EGFR",
        targetChEMBLId: "CHEMBL203",
        saveToDatabase: true,
      });

      setResult(response);

      // Notify parent history state
      if (onSave) {
        onSave({
          id: response.database_id || `pred-${Date.now()}`,
          compoundName: response.compound_name,
          name: response.compound_name,
          smiles: response.canonical_smiles,
          target: `${response.target_protein} (${response.target_chembl_id})`,
          score: response.predicted_pchembl_value,
          pchembl: response.predicted_pchembl_value,
          activity: response.activity_classification,
          model: response.model_name,
          type: "Machine Learning (Random Forest)",
          savedToDb: response.saved_to_database,
        });
      }

      if (response.saved_to_database) {
        setSuccess("Prediction calculated with Random Forest and saved to MongoDB Atlas!");
      } else {
        setSuccess("Prediction calculated successfully using trained Random Forest model.");
      }
    } catch (err) {
      setError(err.message || "Failed to calculate prediction. Please verify SMILES syntax.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="page-section tatva-predict">
      <div className="section-heading tatva-predict-heading">
        <span className="tatva-eyebrow">TARGET: EGFR (CHEMBL203)</span>
        <h2>Predict Compound Activity</h2>
        <p>
          Evaluate bioactivity (pChEMBL / IC50) of small molecule compounds against
          Epidermal Growth Factor Receptor (EGFR) using our trained Random Forest model.
        </p>
      </div>

      <div className="tatva-predict-layout">
        <form className="tatva-predict-form" onSubmit={handlePredict}>
          <div className="tatva-form-header">
            <div>
              <span className="tatva-step-label">01 / MOLECULAR INPUT</span>
              <h3>Chemical Structure</h3>
              <p>Enter compound name and SMILES representation.</p>
            </div>
            <div className="tatva-form-icon">⌬</div>
          </div>

          {/* Quick sample selector */}
          <div style={{ marginBottom: "16px" }}>
            <span style={{ fontSize: "11px", fontWeight: "600", color: "#668873", display: "block", marginBottom: "6px" }}>
              Quick load EGFR reference inhibitors:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {QUICK_SAMPLES.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => handleSelectSample(s)}
                  style={{
                    fontSize: "11px",
                    padding: "4px 9px",
                    background: compoundName === s.name ? "#205239" : "#edf4ee",
                    color: compoundName === s.name ? "#ffffff" : "#294638",
                    border: "1px solid #d5e2d6",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                  title={s.desc}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="tatva-field-group">
            <label htmlFor="compoundName">Compound name / ID</label>
            <input
              id="compoundName"
              type="text"
              value={compoundName}
              onChange={(e) => setCompoundName(e.target.value)}
              placeholder="e.g. Gefitinib, Erlotinib, CMP-001"
              required
            />
          </div>

          <div className="tatva-field-group">
            <label htmlFor="smiles">SMILES string</label>
            <input
              id="smiles"
              type="text"
              value={smiles}
              onChange={(e) => setSmiles(e.target.value)}
              placeholder="e.g. COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1"
              required
            />
            <span className="tatva-field-hint">
              Valid chemical SMILES parsed and feature-extracted using RDKit (Morgan Fingerprints 2048-bit + Descriptors).
            </span>
          </div>

          <div className="tatva-field-group">
            <label htmlFor="target">Biological Target</label>
            <input
              id="target"
              type="text"
              value={target}
              readOnly
              style={{ backgroundColor: "#f2f5f1", cursor: "not-allowed" }}
            />
            <span className="tatva-field-hint">
              Target protein: Human Epidermal Growth Factor Receptor (ChEMBL ID: CHEMBL203).
            </span>
          </div>

          {error && (
            <p className="tatva-form-message error" role="alert">
              ⚠️ {error}
            </p>
          )}

          {success && (
            <p className="tatva-success-message" role="status">
              ✓ {success}
            </p>
          )}

          <button
            type="submit"
            className="tatva-predict-button"
            disabled={isLoading}
          >
            {isLoading ? "Running Prediction Pipeline..." : "Predict Activity (Random Forest)"}
            <span>{isLoading ? "⏳" : "→"}</span>
          </button>

          <p className="tatva-form-footnote">
            Model: Random Forest (300 estimators) · EGFR IC50 Post-2020 Dataset · R² = 0.5468
          </p>
        </form>

        <div className="tatva-predict-info">
          <span className="tatva-step-label">PIPELINE ARCHITECTURE</span>
          <h3>From Structure to Potency</h3>
          <p>
            TatvaLab transforms chemical SMILES into bioactivity predictions through an end-to-end ML pipeline.
          </p>

          <div className="tatva-process-list">
            <div className="tatva-process-item">
              <span>01</span>
              <div>
                <strong>RDKit SMILES Parsing</strong>
                <p>Validates chemical valency and calculates canonical SMILES.</p>
              </div>
            </div>

            <div className="tatva-process-item">
              <span>02</span>
              <div>
                <strong>Feature Representation</strong>
                <p>Generates 2,048-bit Morgan Fingerprints (radius 2) + 6 Physicochemical Descriptors (MW, LogP, TPSA, HBD, HBA, RotB).</p>
              </div>
            </div>

            <div className="tatva-process-item">
              <span>03</span>
              <div>
                <strong>Random Forest Inference</strong>
                <p>Predicts continuous pChEMBL value [-log10(IC50 M)]. pChEMBL ≥ 7 represents high nanomolar potency.</p>
              </div>
            </div>

            <div className="tatva-process-item">
              <span>04</span>
              <div>
                <strong>MongoDB Atlas Persistence</strong>
                <p>Stores compound metadata, properties, and predictions in the 'predictions' collection for history tracking.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="tatva-result-card">
          <div className="tatva-result-header">
            <div>
              <span className="tatva-step-label">PREDICTION SUMMARY</span>
              <h3>Activity Result: {result.compound_name}</h3>
            </div>
            <span
              className="tatva-demo-badge"
              style={{
                backgroundColor: result.predicted_pchembl_value >= 7.0 ? "#e3f5e7" : "#edf4ee",
                color: result.predicted_pchembl_value >= 7.0 ? "#1c6832" : "#316d49",
              }}
            >
              {result.model_name.toUpperCase()} PREDICTION
            </span>
          </div>

          <div className="tatva-result-details">
            <div>
              <span>Predicted pChEMBL Value</span>
              <strong style={{ fontSize: "22px", color: "#173d2d" }}>
                {result.predicted_pchembl_value.toFixed(4)}
              </strong>
            </div>

            <div>
              <span>Activity Classification</span>
              <strong style={{ color: result.predicted_pchembl_value >= 7.0 ? "#1a6634" : "#4a6354" }}>
                {result.activity_classification}
              </strong>
            </div>

            <div>
              <span>Biological Target</span>
              <strong>{result.target}</strong>
            </div>

            <div>
              <span>Model Architecture</span>
              <strong>{result.model_name} (Trained on 2,000 EGFR Compounds)</strong>
            </div>

            <div>
              <span>Canonical SMILES</span>
              <strong style={{ fontSize: "11px", wordBreak: "break-all" }}>
                {result.canonical_smiles}
              </strong>
            </div>

            <div>
              <span>Database Status</span>
              <strong>
                {result.saved_to_database ? (
                  <span style={{ color: "#1c6832" }}>
                    ✓ Saved to MongoDB (ID: {result.database_id?.slice(-8) || "saved"})
                  </span>
                ) : (
                  <span style={{ color: "#9c6020" }}>
                    Stored in session ({result.database_error ? "MongoDB auth verification required" : "Local session"})
                  </span>
                )}
              </strong>
            </div>
          </div>

          {result.molecular_properties && (
            <div style={{ marginTop: "18px", padding: "14px", background: "#f9faf8", borderRadius: "8px", border: "1px solid #e2eae1" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#547862", display: "block", marginBottom: "8px" }}>
                CALCULATED MOLECULAR DESCRIPTORS (RDKIT)
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", fontSize: "12px" }}>
                <div><strong>MW:</strong> {result.molecular_properties.molecular_weight} g/mol</div>
                <div><strong>AlogP:</strong> {result.molecular_properties.alogp}</div>
                <div><strong>TPSA:</strong> {result.molecular_properties.tpsa} Å²</div>
                <div><strong>H-Donors:</strong> {result.molecular_properties.hbd}</div>
                <div><strong>H-Acceptors:</strong> {result.molecular_properties.hba}</div>
                <div><strong>Rot. Bonds:</strong> {result.molecular_properties.rotatable_bonds}</div>
              </div>
            </div>
          )}

          <div className="tatva-result-disclaimer">
            Predictions are generated by TatvaLab's trained machine learning model based on Post-2020 EGFR IC50 assays from ChEMBL. pChEMBL = -log10(IC50 [M]). High potency represents values ≥ 7.0 (nanomolar IC50).
          </div>
        </div>
      )}
    </section>
  );
}
