
import { stats, compounds } from "../data/mockData";

export default function Dashboard({ history, onNavigate }) {
  const recent = history.length
    ? history.slice(0, 5).map((item) => ({
        ...item,
        score: Number(item.score) || 0
      }))
    : compounds;

  return (
    <div className="dashboard-page">
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">YOUR RESEARCH AT A GLANCE</span>
          <h2>Good science starts<br />with better questions.</h2>
          <p>
            Explore candidate compounds, examine molecular activity,
            and organise your discovery workflow.
          </p>
          <button className="primary-button" onClick={() => onNavigate("predict")}>
            Start a prediction <span>→</span>
          </button>
        </div>
        <div className="welcome-art" aria-hidden="true">⌬</div>
      </section>

      <section className="stats-grid">
        {stats.map((stat, index) => (
          <article className="stat-card" key={stat.label}>
            <div className="stat-card-top">
              <span className="stat-number-icon">{["⌬", "◎", "▤", "↗"][index]}</span>
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
            <h3>Recent compounds</h3>
            <p>Candidate molecules from your discovery workspace</p>
          </div>
          <button className="secondary-button" onClick={() => onNavigate("screening")}>
            Virtual screening →
          </button>
        </div>

        <div className="table-wrap">
          <table className="compound-table">
            <thead>
              <tr>
                <th>COMPOUND</th>
                <th>PRIMARY TARGET</th>
                <th>ACTIVITY SCORE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <span className="table-subtitle">{item.id}</span>
                  </td>
                  <td>{item.target}</td>
                  <td>
                    <div className="score-cell">
                      <div className="score-track">
                        <span style={{ width: `${item.score * 100}%` }} />
                      </div>
                      {Math.round(item.score * 100)}%
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${
                      item.score >= 0.8 ? "status-high" :
                      item.score >= 0.6 ? "status-review" : "status-low"
                    }`}>
                      {item.score >= 0.8 ? "High potential" :
                       item.score >= 0.6 ? "Review" : "Low potential"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="demo-note">
        Demo data only. Scores are illustrative and are not validated biological predictions.
      </p>
    </div>
  );
}
