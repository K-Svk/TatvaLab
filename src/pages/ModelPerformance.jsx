
import { performanceMetrics } from "../data/mockData";

export default function ModelPerformance() {
  return (
    <div className="tool-page">
      <div className="page-intro-row">
        <div>
          <span className="eyebrow">MODEL EVALUATION</span>
          <h2>Model performance</h2>
          <p>Review the evaluation metrics displayed by the demo interface.</p>
        </div>
        <span className="demo-tag">DEMO METRICS</span>
      </div>

      <section className="metric-grid">
        {performanceMetrics.map((metric) => (
          <article className="panel metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value.toFixed(1)}%</strong>
            <div className="metric-progress">
              <span style={{ width: `${metric.value}%` }} />
            </div>
          </article>
        ))}
      </section>

      <section className="panel tool-form">
        <h3>Evaluation overview</h3>
        <p className="section-description">
          Accuracy measures the proportion of correctly classified samples.
          Precision, recall, and F1 score provide complementary information
          about classification performance.
        </p>

        <div className="configuration-list">
          <div className="configuration-row"><span>Example model</span><strong>Random Forest</strong></div>
          <div className="configuration-row"><span>Example split</span><strong>80% training / 20% testing</strong></div>
          <div className="configuration-row"><span>Example features</span><strong>Molecular descriptors</strong></div>
          <div className="configuration-row"><span>Model connection</span><strong>Not connected</strong></div>
        </div>
      </section>

      <p className="demo-note">
        All displayed metric values are placeholders. Replace them with measurements
        from your trained model and held-out test dataset.
      </p>
    </div>
  );
}
