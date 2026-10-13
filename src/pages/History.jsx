
export default function History({ history }) {
  return (
    <section className="page-section">
      <div className="section-heading">
        <h2>Prediction History</h2>
        <p>Review results saved during this browser session.</p>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <h3>No history yet</h3>
          <p>Run a demonstration prediction or save screening candidates.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Compound</th>
                <th>Target</th>
                <th>Score</th>
                <th>Type</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.compoundName || entry.name || "Unnamed"}</td>
                  <td>{entry.target || "—"}</td>
                  <td>
                    {typeof entry.score === "number"
                      ? entry.score.toFixed(2)
                      : "—"}
                  </td>
                  <td>{entry.type || "Prediction"}</td>
                  <td>{entry.createdAt || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
