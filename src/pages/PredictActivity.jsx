
import { useState } from "react";

export default function PredictActivity({ onSave }) {
  const [compoundName, setCompoundName] = useState("");
  const [target, setTarget] = useState("");
  const [smiles, setSmiles] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handlePredict = (event) => {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!compoundName.trim() || !target.trim() || !smiles.trim()) {
      setError("Please complete all three fields.");
      return;
    }

    const seed = [...smiles].reduce(
      (total, character) => total + character.charCodeAt(0),
      0
    );

    const score = Number(((seed % 100) / 100).toFixed(2));

    const prediction = {
      compoundName: compoundName.trim(),
      target: target.trim(),
      smiles: smiles.trim(),
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

    setError("Result saved to Prediction History.");
  };

  return (
    <section className="page-section">
      <div className="section-heading">
        <h2>Predict Compound Activity</h2>
        <p>Enter compound details to explore a demonstration result.</p>
      </div>

      <form className="form-card" onSubmit={handlePredict}>
        <label htmlFor="compoundName">Compound name</label>
        <input
          id="compoundName"
          value={compoundName}
          onChange={(event) => setCompoundName(event.target.value)}
          placeholder="e.g. Compound A"
        />

        <label htmlFor="target">Biological target</label>
        <input
          id="target"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder="e.g. EGFR"
        />

        <label htmlFor="smiles">SMILES notation</label>
        <textarea
          id="smiles"
          value={smiles}
          onChange={(event) => setSmiles(event.target.value)}
          placeholder="Enter a compound's SMILES string"
          rows={3}
        />

        <button type="submit" className="primary-button">
          Predict Activity
        </button>
      </form>

      {error && <p role="status">{error}</p>}

      {result && (
        <div className="result-card">
          <h3>Demonstration Result</h3>
          <p><strong>Compound:</strong> {result.compoundName}</p>
          <p><strong>Target:</strong> {result.target}</p>
          <p><strong>Demo score:</strong> {result.score}</p>
          <p><strong>Illustrative classification:</strong> {result.activity}</p>
          <p>
            This is a placeholder score, not a scientifically validated
            prediction from a trained model.
          </p>
          <button type="button" onClick={saveResult}>
            Save to History
          </button>
        </div>
      )}
    </section>
  );
}
