
/**
 * TatvaLab Centralized API Service
 * Connects React Frontend with FastAPI Backend.
 */

const API_BASE_URL = "http://127.0.0.1:8000";

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data.detail ||
        data.message ||
        `Request failed with status ${response.status}`;

      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error.message);
    throw error;
  }
}

const api = {
  baseUrl: API_BASE_URL,

  // Health Check
  async checkHealth() {
    return request("/health");
  },

  // MongoDB Status
  async getMongoStatus() {
    return request("/mongodb-status");
  },

  // Validate SMILES
  async validateSmiles(smiles) {
    return request("/validate-smiles", {
      method: "POST",
      body: JSON.stringify({ smiles }),
    });
  },

  // Predict Compound Activity
  async predictActivity({
    compoundName,
    smiles,
    targetProtein = "EGFR",
    targetChEMBLId = "CHEMBL203",
    saveToDatabase = true,
  }) {
    return request("/predict-activity", {
      method: "POST",
      body: JSON.stringify({
        compound_name: compoundName,
        smiles,
        target_protein: targetProtein,
        target_chembl_id: targetChEMBLId,
        save_to_database: saveToDatabase,
      }),
    });
  },

  // Get Prediction History
  async getPredictions(limit = 50, skip = 0) {
    return request(`/predictions?limit=${limit}&skip=${skip}`);
  },

  // Get Prediction by ID
  async getPredictionById(id) {
    return request(`/predictions/${id}`);
  },

  // Save Prediction
  async savePrediction(prediction) {
    return request("/predictions", {
      method: "POST",
      body: JSON.stringify(prediction),
    });
  },

  // Model Performance
  async getModelPerformance() {
    return request("/model-performance");
  },

  // Dashboard Statistics
  async getDashboardStats() {
    return request("/dashboard-stats");
  },

  // Virtual Screening
  async runVirtualScreening(compounds, saveToDatabase = false) {
    return request("/virtual-screening", {
      method: "POST",
      body: JSON.stringify({
        compounds,
        save_to_database: saveToDatabase,
      }),
    });
  },
};

export { api };
export default api;
