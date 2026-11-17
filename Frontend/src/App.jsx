import "./App.css";
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import PredictActivity from "./pages/PredictActivity";
import VirtualScreening from "./pages/VirtualScreening";
import ModelPerformance from "./pages/ModelPerformance";
import History from "./pages/History";
import api from "./services/api";

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [history, setHistory] = useState([]);
  const [backendStatus, setBackendStatus] = useState({ online: false, mongo: false });

  // Load initial history from MongoDB on startup
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        const [health, predictions] = await Promise.all([
          api.checkHealth().catch(() => null),
          api.getPredictions(50).catch(() => null),
        ]);

        if (isMounted) {
          if (health) {
            setBackendStatus({
              online: true,
              mongo: health.mongodb === "connected",
            });
          }
          if (predictions && Array.isArray(predictions.data)) {
            setHistory(
              predictions.data.map((item) => ({
                id: item.id || item._id,
                compoundName: item.compound_name,
                name: item.compound_name,
                smiles: item.canonical_smiles || item.original_smiles,
                target: item.target_protein || "EGFR",
                pchembl: item.predicted_pchembl_value,
                score: item.predicted_pchembl_value,
                model: item.model_name || "Random Forest",
                savedToDb: true,
                createdAt: item.created_at ? new Date(item.created_at).toLocaleString() : "Saved",
                type: "Trained Random Forest",
              }))
            );
          }
        }
      } catch (err) {
        console.warn("Notice: Initial backend sync completed with fallback:", err.message);
      }
    }
    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  const addHistory = (entry) => {
    setHistory((previous) => [
      {
        ...entry,
        id: entry.id || Date.now() + Math.random(),
        createdAt: entry.createdAt || new Date().toLocaleString(),
      },
      ...previous,
    ]);
  };

  const pages = {
    dashboard: [
      "Dashboard",
      "Overview of your TatvaLab EGFR drug discovery workspace",
    ],
    predict: [
      "Predict Activity",
      "RDKit molecular feature extraction & Random Forest bioactivity prediction",
    ],
    screening: [
      "Virtual Screening",
      "Screen and prioritize small molecule libraries against EGFR",
    ],
    performance: [
      "Model Performance",
      "Quantitative comparison of Random Forest vs XGBoost models",
    ],
    history: [
      "Prediction History",
      "Persisted compound predictions in MongoDB Atlas and active sessions",
    ],
  };

  const [title, subtitle] = pages[activePage] || pages.dashboard;

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
      />

      <div className="main-area">
        <Topbar
          title={title}
          subtitle={subtitle}
        />

        <main className="page-content">
          {activePage === "dashboard" && (
            <Dashboard
              history={history}
              onNavigate={setActivePage}
            />
          )}

          {activePage === "predict" && (
            <PredictActivity
              onSave={addHistory}
            />
          )}

          {activePage === "screening" && (
            <VirtualScreening
              onSave={addHistory}
            />
          )}

          {activePage === "performance" && (
            <ModelPerformance />
          )}

          {activePage === "history" && (
            <History history={history} />
          )}
        </main>

        <footer className="app-footer">
          <span className="footer-brand">
            Tatva<span>Lab</span>
          </span>
          <span>
            Machine Learning-Based Drug Discovery System · EGFR (CHEMBL203) · Random Forest R² = 0.5468
          </span>
        </footer>
      </div>
    </div>
  );
}
