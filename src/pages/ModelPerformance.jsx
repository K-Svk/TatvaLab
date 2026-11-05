
import { performanceMetrics } from "../data/mockData";
import "./ModelPerformance.css";

export default function ModelPerformance() {
  return (
    <div className="tool-page tatva-performance">
      <div className="tatva-performance-header">
        <div>
          <span className="tatva-performance-eyebrow">
            MODEL EVALUATION
          </span>
          <h2>Model Performance</h2>
          <p>
            Explore the evaluation metrics and configuration of the
            demonstration model.
          </p>
        </div>

        <span className="tatva-performance-tag">
          DEMO METRICS
        </span>
      </div>

      <section className="tatva-metric-grid">
        {performanceMetrics.map((metric, index) => (
          <article
            className="tatva-metric-card"
            key={metric.label}
          >
            <div className="tatva-metric-top">
              <span>{metric.label}</span>
              <span className="tatva-metric-indicator">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>

            <strong className="tatva-metric-value">
              {metric.value.toFixed(1)}%
            </strong>

            <div
              className="tatva-metric-progress"
              role="img"
              aria-label={`${metric.label}: ${metric.value.toFixed(1)} percent, illustrative`}
            >
              <span
                style={{
                  width: `${Math.max(0, Math.min(100, metric.value))}%`,
                }}
              />
            </div>

            <span className="tatva-metric-caption">
              Illustrative evaluation value
            </span>
          </article>
        ))}
      </section>

      <section className="tatva-performance-overview">
        <div className="tatva-overview-header">
          <div>
            <span className="tatva-performance-eyebrow">
              MODEL INFORMATION
            </span>
            <h3>Evaluation Overview</h3>
            <p>
              Configuration details associated with the demonstration.
            </p>
          </div>

          <div className="tatva-overview-icon">⌬</div>
        </div>

        <div className="tatva-configuration-list">
          <div className="tatva-configuration-row">
            <div>
              <span className="tatva-config-label">Model algorithm</span>
              <span className="tatva-config-description">
                Example classification model
              </span>
            </div>
            <strong>Random Forest</strong>
          </div>

          <div className="tatva-configuration-row">
            <div>
              <span className="tatva-config-label">Dataset split</span>
              <span className="tatva-config-description">
                Example training and testing distribution
              </span>
            </div>
            <strong>80% / 20%</strong>
          </div>

          <div className="tatva-configuration-row">
            <div>
              <span className="tatva-config-label">Input features</span>
              <span className="tatva-config-description">
                Molecular representation
              </span>
            </div>
            <strong>Molecular descriptors</strong>
          </div>

          <div className="tatva-configuration-row">
            <div>
              <span className="tatva-config-label">Evaluation status</span>
              <span className="tatva-config-description">
                Live model integration
              </span>
            </div>
            <span className="tatva-connection-status">
              Not connected
            </span>
          </div>
        </div>
      </section>

      <section className="tatva-metric-explanation">
        <div>
          <span className="tatva-performance-eyebrow">
            UNDERSTANDING THE METRICS
          </span>
          <h3>How is model performance measured?</h3>
        </div>

        <div className="tatva-explanation-grid">
          <div>
            <strong>Accuracy</strong>
            <p>
              Measures the proportion of correctly classified
              predictions among all predictions.
            </p>
          </div>

          <div>
            <strong>Precision</strong>
            <p>
              Measures how many positive predictions are actually
              positive.
            </p>
          </div>

          <div>
            <strong>Recall</strong>
            <p>
              Measures how many actual positive cases the model
              successfully identifies.
            </p>
          </div>

          <div>
            <strong>F1 Score</strong>
            <p>
              Represents the harmonic mean of precision and recall.
            </p>
          </div>
        </div>
      </section>

      <div className="tatva-performance-disclaimer">
        <span>ⓘ</span>
        <p>
          All displayed metric values are illustrative placeholders.
          They do not represent the measured performance of a trained
          machine learning model. Actual evaluation metrics will be
          integrated after model development and testing.
        </p>
      </div>
    </div>
  );
}
