import "./App.css";
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import PredictActivity from "./pages/PredictActivity";
import VirtualScreening from "./pages/VirtualScreening";
import ModelPerformance from "./pages/ModelPerformance";
import History from "./pages/History";

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [history, setHistory] = useState([]);

  const addHistory = (entry) => {
    setHistory((previous) => [
      {
        ...entry,
        id: Date.now() + Math.random(),
        createdAt: new Date().toLocaleString(),
      },
      ...previous,
    ]);
  };

  const pages = {
    dashboard: [
      "Dashboard",
      "An overview of your TatvaLab research workspace",
    ],
    predict: [
      "Predict Activity",
      "Explore compound activity predictions",
    ],
    screening: [
      "Virtual Screening",
      "Filter and prioritise candidate compounds",
    ],
    performance: [
      "Model Performance",
      "Review model evaluation metrics",
    ],
    history: [
      "Prediction History",
      "Review your previous analyses",
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
            AI-powered drug discovery · Demo mode
          </span>
        </footer>
      </div>
    </div>
  );
}
