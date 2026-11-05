
import { useState } from "react";
import "./PredictActivity.css";

export default function PredictActivity({ onSave }) {
  const [compoundName, setCompoundName] = useState("");
  const [target, setTarget] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handlePredict = (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setResult(null);

    if (!compoundName.trim() || !target.trim()) {
      setError("Please enter both the compound name and biological target.");
      return;
    }

    const seed = [...`${compoundName.trim()}${target.trim()}`].reduce(
      (total, character) => total + character.charCodeAt(0),
      0
    );

    const score = Number(((seed % 100) / 100).toFixed(2));

    const prediction = {
      compoundName: compoundName.trim(),
      target: target.trim(),
      score,
      activity: score >= 0.5 ? "Potential activity" : "Low predicted activity",
      type: "Single compound prediction",
    };

    setResult(prediction);
  };

  const saveResult = () => {
    if (!result) return;

    onSave({
      ...result,
      name: result.compoundName,
    });

    setSuccess("Result successfully saved to Prediction History.");
  };

  return (
    <section className="page-section tatva-predict">
      <div className="section-heading tatva-predict-heading">
        <span className="tatva-eyebrow">COMPOUND ANALYSIS</span>
        <h2>Predict Compound Activity</h2>
        <p>
          Explore the potential biological activity of a chemical compound
          against a selected biological target.
        </p>
      </div>

      <div className="tatva-predict-layout">
        <form className="tatva-predict-form" onSubmit={handlePredict}>
          <div className="tatva-form-header">
            <div>
              <span className="tatva-step-label">01 / INPUT</span>
              <h3>Compound details</h3>
              <p>Enter the details of the compound you want to explore.</p>
            </div>
            <div className="tatva-form-icon">⌬</div>
          </div>

          <div className="tatva-field-group">
            <label htmlFor="compoundName">Compound name</label>
            <input
              id="compoundName"
              type="text"
              value={compoundName}
              onChange={(event) => setCompoundName(event.target.value)}
              placeholder="e.g. Compound A"
            />
          </div>

          <div className="tatva-field-group">
            <label htmlFor="target">Biological target</label>
            <input
              id="target"
              type="text"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="e.g. EGFR, JAK2, BRAF"
            />
            <span className="tatva-field-hint">
              Enter the protein or biological target of interest.
            </span>
          </div>

          {error && (
            <p className="tatva-form-message error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="tatva-predict-button">
            Explore Activity <span>→</span>
          </button>

          <p className="tatva-form-footnote">
            Frontend demonstration · Illustrative results only
          </p>
        </form>

        <div className="tatva-predict-info">
          <span className="tatva-step-label">HOW IT WORKS</span>
          <h3>From compound to insight.</h3>
          <p>
            Biological activity prediction helps researchers investigate
            how a chemical compound may interact with a particular
            biological target.
          </p>

          <div className="tatva-process-list">
            <div className="tatva-process-item">
              <span>01</span>
              <div>
                <strong>Compound input</strong>
                <p>Provide the compound name.</p>
              </div>
            </div>

            <div className="tatva-process-item">
              <span>02</span>
              <div>
                <strong>Target selection</strong>
                <p>Specify the biological target.</p>
              </div>
            </div>

            <div className="tatva-process-item">
              <span>03</span>
              <div>
                <strong>Activity assessment</strong>
                <p>Explore the demonstration result.</p>
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
              <h3>Demonstration Result</h3>
            </div>
            <span className="tatva-demo-badge">DEMO RESULT</span>
          </div>

          <div className="tatva-result-details">
            <div>
              <span>Compound</span>
              <strong>{result.compoundName}</strong>
            </div>
            <div>
              <span>Biological target</span>
              <strong>{result.target}</strong>
            </div>
            <div>
              <span>Illustrative score</span>
              <strong>{result.score.toFixed(2)}</strong>
            </div>
            <div>
              <span>Classification</span>
              <strong>{result.activity}</strong>
            </div>
          </div>

          <div className="tatva-result-disclaimer">
            This is a placeholder result generated for frontend demonstration.
            It is not a scientifically validated prediction from a trained
            machine learning model.
          </div>

          <button
            type="button"
            className="tatva-save-button"
            onClick={saveResult}
          >
            Save to Prediction History
          </button>

          {success && (
            <p className="tatva-success-message" role="status">
              {success}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
