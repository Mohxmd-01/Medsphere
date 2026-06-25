import { create } from "zustand";
import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api";

export interface User {
  username: string;
  role: string;
  full_name: string;
}

export interface Patient {
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  bmi: number;
  height_cm: number;
  weight_kg: number;
  risk_category: string;
  risk_score: number;
  latest_hba1c?: number;
  latest_bp?: number;
}

export interface PatientDetails extends Patient {
  diagnoses: any[];
  medications: any[];
  lab_results: any[];
  clinical_notes: any[];
  doctor_notes: any[];
  risk_assessment: any;
  clinical_report: any;
}

export interface GraphNode {
  id: string;
  type: string;
  data: {
    label: string;
    type: string;
    properties: any;
  };
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  animated?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface ClinicalState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  patients: Patient[];
  selectedPatientId: string | null;
  selectedPatient: PatientDetails | null;
  patientTimeline: any[];
  graphData: GraphData;
  guidelines: any[];
  guidelineResults: any[];
  isLoading: boolean;
  error: string | null;
  dashboardStats: any | null;
  fetchDashboardStats: () => Promise<void>;

  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchPatients: (search?: string, riskCategory?: string) => Promise<void>;
  setSelectedPatientId: (patientId: string) => void;
  fetchPatientDetails: (patientId: string) => Promise<void>;
  fetchPatientTimeline: (patientId: string) => Promise<void>;
  fetchPatientGraph: (patientId: string) => Promise<void>;
  fetchGuidelines: () => Promise<void>;
  searchGuidelines: (query: string) => Promise<void>;
  runAgentWorkflow: (patientId: string, rawText?: string, filename?: string) => Promise<any>;
  uploadDocument: (formData: FormData) => Promise<any>;
  clearError: () => void;
}

// Set default auth token if stored
const getInitialToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("medsphere_token");
  }
  return null;
};

const getInitialUser = () => {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("medsphere_user");
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
};

const getAxiosConfig = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("medsphere_token") : null;
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  };
};

export const useStore = create<ClinicalState>((set, get) => ({
  token: getInitialToken(),
  user: getInitialUser(),
  isAuthenticated: !!getInitialToken(),
  patients: [],
  selectedPatientId: null,
  selectedPatient: null,
  patientTimeline: [],
  graphData: { nodes: [], edges: [] },
  guidelines: [],
  guidelineResults: [],
  isLoading: false,
  error: null,
  dashboardStats: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      // Build form data for standard FastAPI OAuth2 login flow
      const params = new URLSearchParams();
      params.append("username", username);
      params.append("password", password);

      const res = await axios.post(`${API_BASE_URL}/auth/login`, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const { access_token, role, full_name } = res.data;
      const userPayload = { username, role, full_name };

      localStorage.setItem("medsphere_token", access_token);
      localStorage.setItem("medsphere_user", JSON.stringify(userPayload));

      set({
        token: access_token,
        user: userPayload,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Invalid login credentials";
      set({ error: errMsg, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("medsphere_token");
    localStorage.removeItem("medsphere_user");
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      patients: [],
      selectedPatientId: null,
      selectedPatient: null,
      patientTimeline: [],
      graphData: { nodes: [], edges: [] },
    });
  },

  fetchDashboardStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.get(`${API_BASE_URL}/patients/dashboard-stats`, getAxiosConfig());
      set({ dashboardStats: res.data, isLoading: false });
    } catch (err: any) {
      console.error("Error loading dashboard stats:", err);
      set({ isLoading: false });
    }
  },

  fetchPatients: async (search, riskCategory) => {
    set({ isLoading: true, error: null });
    try {
      const params: any = {};
      if (search) params.search = search;
      if (riskCategory && riskCategory !== "All") params.risk_category = riskCategory;

      const res = await axios.get(`${API_BASE_URL}/patients`, {
        ...getAxiosConfig(),
        params,
      });
      set({ patients: res.data.patients, isLoading: false });
      
      // Auto-select first patient if none selected yet
      if (res.data.patients.length > 0 && !get().selectedPatientId) {
        get().setSelectedPatientId(res.data.patients[0].patient_id);
      }
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Error loading patients grid", isLoading: false });
    }
  },

  setSelectedPatientId: (patientId) => {
    set({ selectedPatientId: patientId });
    // Trigger sub-data refreshes
    get().fetchPatientDetails(patientId);
    get().fetchPatientTimeline(patientId);
    get().fetchPatientGraph(patientId);
  },

  fetchPatientDetails: async (patientId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.get(`${API_BASE_URL}/patients/${patientId}`, getAxiosConfig());
      set({ selectedPatient: res.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Error loading patient details", isLoading: false });
    }
  },

  fetchPatientTimeline: async (patientId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/patients/${patientId}/timeline`, getAxiosConfig());
      set({ patientTimeline: res.data });
    } catch (err: any) {
      console.error("Error loading patient timeline:", err);
    }
  },

  fetchPatientGraph: async (patientId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/graph/${patientId}`, getAxiosConfig());
      set({ graphData: res.data });
    } catch (err: any) {
      console.error("Error loading patient Neo4j graph:", err);
    }
  },

  fetchGuidelines: async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/guidelines`, getAxiosConfig());
      set({ guidelines: res.data });
    } catch (err: any) {
      console.error("Error loading guideline docs list:", err);
    }
  },

  searchGuidelines: async (query) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.get(`${API_BASE_URL}/guidelines/search`, {
        ...getAxiosConfig(),
        params: { query },
      });
      set({ guidelineResults: res.data.results, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Error searching vector guidelines", isLoading: false });
    }
  },

  runAgentWorkflow: async (patientId, rawText, filename) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post(
        `${API_BASE_URL}/agents/run`,
        {
          patient_id: patientId,
          raw_text: rawText,
          filename: filename,
        },
        getAxiosConfig()
      );
      // Refresh clinical reports & status logs
      get().fetchPatientDetails(patientId);
      get().fetchPatientGraph(patientId);
      set({ isLoading: false });
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Error executing multi-agent reasoning workflow";
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  uploadDocument: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          ...getAxiosConfig().headers,
          "Content-Type": "multipart/form-data",
        },
      });
      
      const resPid = res.data.patient_id;
      if (resPid) {
        // Switch to the newly analyzed patient and refresh grid
        get().fetchPatients();
        get().setSelectedPatientId(resPid);
      }
      set({ isLoading: false });
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Document upload and OCR pipeline execution failed";
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
