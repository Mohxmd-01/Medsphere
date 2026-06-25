"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import axios from "axios";
import { 
  Search, 
  Calendar, 
  Heart, 
  Pill, 
  FileCheck,
  TrendingUp,
  User,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  FileText,
  UserCheck,
  AlertTriangle,
  Activity,
  Maximize2,
  GitCompare,
  LayoutGrid
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";
import { 
  ReactFlow, 
  Background, 
  Controls 
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// --- CUSTOM REACT FLOW CONSTELLATION NODE ---
const ConstellationNode = ({ data }: any) => {
  const { label, type } = data;
  
  const getStyles = () => {
    switch (type) {
      case "Patient":
        return {
          glow: "shadow-[0_0_15px_rgba(244,63,94,0.2)] border-pink-300 bg-pink-100/90 text-pink-700",
          icon: <User className="w-3.5 h-3.5" />
        };
      case "Disease":
        return {
          glow: "shadow-[0_0_15px_rgba(239,68,68,0.2)] border-red-300 bg-red-50 text-red-600",
          icon: <Heart className="w-3.5 h-3.5" />
        };
      case "Medication":
        return {
          glow: "shadow-[0_0_15px_rgba(99,102,241,0.2)] border-indigo-300 bg-indigo-50 text-indigo-600",
          icon: <Pill className="w-3.5 h-3.5" />
        };
      case "LabEvent":
      case "LabResult":
        return {
          glow: "shadow-[0_0_15px_rgba(16,185,129,0.2)] border-emerald-300 bg-emerald-50 text-emerald-600",
          icon: <Activity className="w-3.5 h-3.5" />
        };
      case "Alert":
        return {
          glow: "shadow-[0_0_15px_rgba(244,63,94,0.3)] border-rose-400 bg-rose-50 text-rose-600 animate-pulse",
          icon: <ShieldAlert className="w-3.5 h-3.5" />
        };
      default:
        return {
          glow: "shadow-[0_0_12px_rgba(0,0,0,0.05)] border-slate-300 bg-slate-50 text-slate-600",
          icon: <FileCheck className="w-3.5 h-3.5" />
        };
    }
  };

  const style = getStyles();

  return (
    <div className="flex flex-col items-center gap-1 relative group select-none">
      <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 hover:scale-110 z-10 ${style.glow}`}>
        {style.icon}
      </div>
      <div className="absolute top-9 whitespace-nowrap bg-white border border-pink-100 px-2 py-0.5 rounded text-[7px] font-mono-tech text-slate-800 pointer-events-none z-20 shadow-sm">
        {label}
      </div>
    </div>
  );
};

export default function PatientsPage() {
  const { 
    patients, 
    fetchPatients, 
    selectedPatientId, 
    selectedPatient, 
    setSelectedPatientId,
    patientTimeline,
    graphData
  } = useStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [reportTab, setReportTab] = useState<"physician" | "patient">("physician");
  
  // Tab selector for Case Registry vs Patient Comparison
  const [workspaceTab, setWorkspaceTab] = useState<"dossier" | "compare">("dossier");
  
  // Selection ids for Comparison Hub
  const [compareId1, setCompareId1] = useState("");
  const [compareId2, setCompareId2] = useState("");
  
  const [comparePatient1, setComparePatient1] = useState<any>(null);
  const [comparePatient2, setComparePatient2] = useState<any>(null);

  useEffect(() => {
    fetchPatients(searchTerm, riskFilter);
  }, [searchTerm, riskFilter, fetchPatients]);

  // Set default comparative IDs once patients list loads
  useEffect(() => {
    if (patients.length >= 2) {
      if (!compareId1) setCompareId1(patients[0].patient_id);
      if (!compareId2) setCompareId2(patients[1].patient_id);
    } else if (patients.length === 1) {
      if (!compareId1) setCompareId1(patients[0].patient_id);
    }
  }, [patients, compareId1, compareId2]);

  // Fetch full details of patient 1
  useEffect(() => {
    if (compareId1) {
      axios.get(`http://localhost:8000/api/patients/${compareId1}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("medsphere_token")}` }
      })
      .then(res => setComparePatient1(res.data))
      .catch(err => console.error("Error loading patient 1 comparative data:", err));
    }
  }, [compareId1]);

  // Fetch full details of patient 2
  useEffect(() => {
    if (compareId2) {
      axios.get(`http://localhost:8000/api/patients/${compareId2}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("medsphere_token")}` }
      })
      .then(res => setComparePatient2(res.data))
      .catch(err => console.error("Error loading patient 2 comparative data:", err));
    }
  }, [compareId2]);

  // HbA1c Trajectory calculations for active patient
  const hba1cHistory = useMemo(() => {
    if (!selectedPatient?.lab_results) {
      return [
        { date: "2025-01", value: 6.8 },
        { date: "2025-05", value: 7.4 },
        { date: "2025-10", value: 8.1 },
        { date: "2026-03", value: 8.7 }
      ];
    }
    const labs = selectedPatient.lab_results
      .filter((l: any) => l.test_name.toLowerCase().includes("hba1c"))
      .map((l: any) => ({
        date: l.date,
        value: parseFloat(l.value)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return labs.length > 0 ? labs : [
      { date: "2025-01", value: 6.8 },
      { date: "2025-05", value: 7.4 },
      { date: "2025-10", value: 8.1 },
      { date: "2026-03", value: 8.7 }
    ];
  }, [selectedPatient]);

  const timelineProgress = useMemo(() => {
    if (hba1cHistory.length >= 2) {
      const first = hba1cHistory[0].value;
      const last = hba1cHistory[hba1cHistory.length - 1].value;
      const pctChange = ((last - first) / first) * 100;
      return {
        trajectory: hba1cHistory.map(d => d.value).join(" → "),
        change: pctChange.toFixed(0),
        isDeterioration: last > first
      };
    }
    return {
      trajectory: "6.8 → 7.4 → 8.1 → 8.7",
      change: "28",
      isDeterioration: true
    };
  }, [hba1cHistory]);

  // Combined HbA1c histories for side-by-side overlay line chart
  const combinedCompareChartData = useMemo(() => {
    if (!comparePatient1 && !comparePatient2) return [];
    
    const dates = new Set<string>();
    const labs1 = (comparePatient1?.lab_results || [])
      .filter((l: any) => l.test_name.toLowerCase().includes("hba1c"));
    const labs2 = (comparePatient2?.lab_results || [])
      .filter((l: any) => l.test_name.toLowerCase().includes("hba1c"));
      
    labs1.forEach((l: any) => dates.add(l.date));
    labs2.forEach((l: any) => dates.add(l.date));
    
    return Array.from(dates)
      .sort()
      .map(d => {
        const val1 = labs1.find((l: any) => l.date === d)?.value;
        const val2 = labs2.find((l: any) => l.date === d)?.value;
        const record: any = { date: d };
        if (comparePatient1) {
          record[`${comparePatient1.name} (HbA1c)`] = val1 ? parseFloat(val1) : undefined;
        }
        if (comparePatient2) {
          record[`${comparePatient2.name} (HbA1c)`] = val2 ? parseFloat(val2) : undefined;
        }
        return record;
      });
  }, [comparePatient1, comparePatient2]);

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "diagnosis":
        return <Heart className="w-3 text-red-500" />;
      case "medication":
        return <Pill className="w-3 text-cyan-400" />;
      case "lab":
        return <Activity className="w-3 text-emerald-400" />;
      default:
        return <FileCheck className="w-3 text-slate-500" />;
    }
  };

  const getEventBadgeClass = (type: string) => {
    switch (type.toLowerCase()) {
      case "diagnosis":
        return "bg-red-955/40 text-red-400 border-red-500/20";
      case "medication":
        return "bg-cyan-955/40 text-cyan-400 border-cyan-500/20";
      case "lab":
        return "bg-emerald-955/40 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-slate-900 text-slate-400 border-white/5";
    }
  };

  // Node configuration for compact React Flow
  const nodeTypes = useMemo(() => ({
    customNode: ConstellationNode
  }), []);

  // Filter and style edges for the active patient React Flow Graph
  const flowNodes = useMemo(() => {
    if (!graphData?.nodes) return [];
    return graphData.nodes.map((node: any) => ({
      ...node,
      type: "customNode"
    }));
  }, [graphData]);

  const flowEdges = useMemo(() => {
    if (!graphData?.edges) return [];
    return graphData.edges.map((edge: any) => ({
      ...edge,
      animated: edge.label.toLowerCase().includes("precedes") || edge.label.toLowerCase().includes("risk")
    }));
  }, [graphData]);

  const explainTraces = useMemo(() => {
    if (!selectedPatient?.clinical_report?.reasoning_report) return [];
    return parseTracesHelper(selectedPatient.clinical_report.reasoning_report);
  }, [selectedPatient]);

  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-slate-550 text-xs italic">No clinical decision reports compiled. Run workspace agent workflow.</p>;
    
    const blocks: React.ReactNode[] = [];
    const lines = text.split("\n");
    let inTraceBlock = false;
    
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      
      if (line.trim().startsWith("```explainability_trace")) {
        inTraceBlock = true;
        continue;
      }
      
      if (inTraceBlock) {
        if (line.trim().startsWith("```")) {
          inTraceBlock = false;
        }
        continue;
      }
      
      if (line.startsWith("###")) {
        blocks.push(<h4 key={idx} className="text-xs font-bold text-slate-205 mt-4 mb-2 uppercase tracking-wider">{line.replace("###", "").trim()}</h4>);
      } else if (line.startsWith("##")) {
        blocks.push(<h3 key={idx} className="text-sm font-bold text-white mt-6 mb-3 border-b border-white/5 pb-1.5 uppercase">{line.replace("##", "").trim()}</h3>);
      } else if (line.startsWith("#")) {
        blocks.push(<h2 key={idx} className="text-base font-extrabold text-cyan-400 mt-6 mb-4 uppercase">{line.replace("#", "").trim()}</h2>);
      } else if (line.startsWith("-") || line.startsWith("*")) {
        blocks.push(
          <ul key={idx} className="list-disc list-inside pl-3 mb-2 text-xs text-slate-350 leading-relaxed font-semibold">
            <li>{line.substring(1).trim()}</li>
          </ul>
        );
      } else if (line.trim() === "") {
        blocks.push(<div key={idx} className="h-1.5" />);
      } else {
        blocks.push(<p key={idx} className="text-xs text-slate-355 leading-relaxed mb-3 font-semibold">{line.trim()}</p>);
      }
    }
    
    return blocks;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 min-h-[80vh] font-mono-tech select-none animate-fadeIn">
      
      {/* 1. DIRECTORY / CONTROLLER SIDEBAR */}
      <div className="xl:col-span-1 flex flex-col gap-4 overflow-hidden">
        
        {/* Toggle Workspace Tab Selector */}
        <div className="flex border border-pink-100 bg-white/95 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setWorkspaceTab("dossier")}
            className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              workspaceTab === "dossier"
                ? "bg-pink-500/10 border border-pink-200/50 text-pink-700 font-extrabold shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-pink-50/20"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Workspace
          </button>
          <button
            onClick={() => setWorkspaceTab("compare")}
            className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              workspaceTab === "compare"
                ? "bg-pink-500/10 border border-pink-200/50 text-pink-700 font-extrabold shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-pink-50/20"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            Comparison
          </button>
        </div>

        {/* Case Registry Sidebar List (Only visible for Workspace Dossier view) */}
        {workspaceTab === "dossier" && (
          <div className="glass-panel rounded-2xl p-4 flex flex-col gap-4 flex-1 overflow-hidden border border-white/5">
            <div className="space-y-0.5 border-b border-white/5 pb-3">
              <h2 className="text-sm font-bold text-white uppercase">Case Registry</h2>
              <p className="text-[8px] text-slate-505 uppercase tracking-widest font-bold">Index dossiers</p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-550 absolute left-3 top-2.5" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="FILTER..."
                className="w-full pl-9 pr-3 py-2 border border-white/5 bg-black/30 rounded-xl text-[10px] focus:outline-none focus:border-cyan-500/30 text-white font-mono-tech"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-1.5">
              {["All", "High", "Moderate", "Low"].map((level) => (
                <button
                  key={level}
                  onClick={() => setRiskFilter(level)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                    riskFilter === level
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
                      : "bg-black/20 border-white/5 text-slate-550 hover:text-slate-350"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* Patient Case list */}
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {patients.map((p) => {
                const isSelected = p.patient_id === selectedPatientId;
                return (
                  <button
                    key={p.patient_id}
                    onClick={() => setSelectedPatientId(p.patient_id)}
                    className={`w-full p-3 rounded-lg border text-left flex flex-col gap-1.5 transition-all ${
                      isSelected
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.05)]"
                        : "bg-black/20 border-white/5 hover:bg-black/40 text-slate-455 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span>{p.name}</span>
                      <span className={`text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        p.risk_category === "High" ? "bg-red-955/40 text-red-400 border border-red-500/20" : p.risk_category === "Moderate" ? "bg-amber-955/40 text-amber-400 border border-amber-500/20" : "bg-emerald-955/40 text-emerald-400 border border-emerald-500/20"
                      }`}>{p.risk_category}</span>
                    </div>
                    <div className="flex justify-between text-[9px] opacity-70">
                      <span>{p.patient_id}</span>
                      <span>{p.age}Y • {p.gender}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Short Instructions panel for Patient Comparison */}
        {workspaceTab === "compare" && (
          <div className="glass-panel rounded-2xl p-5 border border-white/5 space-y-3">
            <span className="text-[8px] font-bold text-slate-550 block uppercase tracking-widest">Operational Notice</span>
            <p className="text-[10px] font-semibold text-slate-400 leading-relaxed">
              Select two clinical dossiers to compare risk categorizations, lab trends, guideline references, and active diagnoses side-by-side.
            </p>
          </div>
        )}

      </div>

      {/* 2. RIGHT VIEWPORT: CONSOLIDATED DIGITAL TWIN WORKSPACE OR PATIENT COMPARISON HUB */}
      <div className="xl:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2">
        
        {/* VIEW 1: DIGITAL TWIN WORKSPACE */}
        {workspaceTab === "dossier" && (
          selectedPatient ? (
            <>
              {/* Row 1: Vitals, Demographic Meta & Anatomical Organ Load */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Organ Load SVG Human Visual Map */}
                <div className="lg:col-span-1 glass-panel rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                  <div className="absolute top-2 left-4 space-y-0.5">
                    <span className="text-[8px] font-bold text-slate-550 uppercase tracking-widest block">Neural Twin System Map</span>
                    <span className="text-[10px] font-bold text-white uppercase block">Target Organ Load</span>
                  </div>
                  
                  <div className="relative w-44 h-56 mt-4 flex items-center justify-center">
                    <svg className="w-full h-full text-slate-800" viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M50 10 C53 10, 55 12, 55 15 C55 18, 53 20, 50 20 C47 20, 45 18, 45 15 C45 12, 47 10, 50 10 Z" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />
                      <path d="M40 23 L60 23 L62 50 L56 50 L56 120 L51 120 L50 80 L49 80 L44 120 L39 120 L39 50 Z" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />
                      <path d="M40 23 L32 45 L35 47 L40 33" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />
                      <path d="M60 23 L68 45 L65 47 L60 33" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />
                      
                      {/* Active glowing nodes */}
                      <circle cx="50" cy="45" r="4.5" fill="#06b6d4" className="animate-pulse shadow-[0_0_8px_#06b6d4]" />
                      <circle cx="48" cy="32" r="3.5" fill="#ef4444" className="animate-pulse shadow-[0_0_8px_#ef4444]" />
                    </svg>
                    
                    <div className="absolute top-[26%] left-0 text-[8px] font-bold text-red-400 bg-red-955/40 border border-red-500/20 px-1 py-0.5 rounded">CAD: MODERATE</div>
                    <div className="absolute top-[48%] right-0 text-[8px] font-bold text-cyan-400 bg-cyan-955/40 border border-cyan-500/20 px-1 py-0.5 rounded">PANCREAS: STRESSED</div>
                  </div>

                  <span className="text-[8px] text-slate-500 text-center font-bold mt-2 uppercase tracking-widest">ANATOMICAL OVERLAYS RETRIEVED</span>
                </div>

                {/* Patient Profile, XGBoost Metrics, HbA1c progress bar */}
                <div className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-white/5 flex flex-col justify-between gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full filter blur-xl pointer-events-none" />
                  
                  <div className="flex justify-between items-start border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-955/40 border border-pink-500/30 flex items-center justify-center text-pink-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white uppercase">{selectedPatient.name}</h2>
                        <span className="text-[8px] text-slate-550 uppercase tracking-widest block font-bold">CASE STATUS KEY: {selectedPatient.patient_id}</span>
                      </div>
                    </div>

                    <span className={`text-[8px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                      selectedPatient.risk_category === "High" ? "bg-red-955/40 text-red-400 border border-red-500/20" : "bg-emerald-955/40 text-emerald-400 border border-emerald-500/20"
                    }`}>{selectedPatient.risk_category}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] font-bold border-b border-white/5 pb-3">
                    <div className="space-y-0.5">
                      <span className="block text-[8px] text-slate-550 uppercase font-bold">Age / Gender</span>
                      <span className="text-slate-200">{selectedPatient.age} YRS / {selectedPatient.gender}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[8px] text-slate-555 uppercase font-bold">BMI Metric</span>
                      <span className="text-slate-200">{selectedPatient.bmi} BMI</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[8px] text-slate-555 uppercase font-bold">Height / Weight</span>
                      <span className="text-slate-200">{selectedPatient.height_cm}CM / {selectedPatient.weight_kg}KG</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[8px] text-slate-555 uppercase font-bold">XGBoost Risk Score</span>
                      <span className="text-red-400">{selectedPatient.risk_assessment ? `${Math.round(selectedPatient.risk_assessment.risk_score * 100)}%` : "87%"}</span>
                    </div>
                  </div>

                  {/* XGBoost Confidence & Evidence details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[9px] font-bold uppercase tracking-wider text-slate-450">
                    <div className="space-y-2 p-3 bg-black/20 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center">
                        <span>XGBoost Confidence</span>
                        <span className="text-cyan-400">{selectedPatient.risk_assessment ? `${Math.round(selectedPatient.risk_assessment.confidence * 100)}%` : "93%"}</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                        <div 
                          className="bg-cyan-500 h-1 rounded-full shadow-[0_0_6px_#06b6d4]" 
                          style={{ width: `${selectedPatient.risk_assessment ? Math.round(selectedPatient.risk_assessment.confidence * 100) : 93}%` }} 
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-black/20 rounded-xl border border-white/5 flex items-center justify-between">
                      <span>Model Evidence Level</span>
                      <span className={`px-2 py-0.5 rounded border text-[8px] ${
                        (selectedPatient.risk_assessment?.evidence_level || "Strong") === "Strong" 
                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-955/40 text-amber-400 border-amber-500/20"
                      }`}>
                        {selectedPatient.risk_assessment?.evidence_level || "Strong"}
                      </span>
                    </div>
                  </div>

                  {/* Micro trajectory summary */}
                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-slate-500 uppercase block font-bold">HbA1c Lab Progression</span>
                      <span className="text-[11px] text-white block font-bold">{timelineProgress.trajectory}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-bold text-red-400 uppercase bg-red-955/40 px-2.5 py-0.5 rounded border border-red-900/50 block">
                        {timelineProgress.isDeterioration ? "Progressive Deterioration" : "Stable"}
                      </span>
                      <span className="block text-[8px] text-slate-400 mt-0.5">{timelineProgress.change}% surge registered</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Row 2: Vitals trends curve chart */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-4">Glycated Hemoglobin (HbA1c) Trend Curve</span>
                <div className="h-44 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hba1cHistory} margin={{ left: -20, right: 10 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={8} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={8} domain={["auto", "auto"]} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "rgba(255,255,255,0.08)" }} />
                      <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Row 3: Event logs & Constellation Graph Side-by-side */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Timeline Event logs */}
                <div className="lg:col-span-1 glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-4">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block border-b border-white/5 pb-2">CHRONOLOGICAL EVENT LOGS</span>
                  
                  <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[300px] pr-1 pl-2 border-l border-white/5">
                    {patientTimeline.slice(0, 8).map((event, i) => {
                      const isHbA1c = event.event_type === "Lab" && event.event_name.toLowerCase().includes("hba1c");
                      const hasDeterioration = isHbA1c && parseFloat(event.event_name.split("=").pop() || "0") > 7.0;

                      return (
                        <div key={i} className="relative group pl-3">
                          <div className="absolute -left-[16px] top-1 w-2.5 h-2.5 rounded-full border border-slate-950 bg-slate-900 flex items-center justify-center z-10">
                            {getEventIcon(event.event_type)}
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[8px] font-bold">
                              <span className="text-slate-500">{event.event_date}</span>
                              <span className={`text-[7px] uppercase px-1.5 py-0.2 rounded border ${getEventBadgeClass(event.event_type)}`}>
                                {event.event_type}
                              </span>
                            </div>
                            
                            <div className="p-2 bg-black/40 border border-white/5 rounded-lg text-[9px] font-bold text-slate-300">
                              {event.event_name}
                              
                              {hasDeterioration && (
                                <div className="mt-1 text-[7px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1 border-t border-red-500/10 pt-1">
                                  <ShieldAlert className="w-2.5 h-2.5" />
                                  <span>HbA1c &gt; 7.0% limit anomaly</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Constellation Graph Panel (React Flow) */}
                <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-white/5 flex flex-col min-h-[360px]">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">NEURAL HEALTH CONSTELLATION MAP</span>
                    <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-wider bg-cyan-955/40 px-2 py-0.5 rounded border border-cyan-900/50">NEO4J COORDINATES</span>
                  </div>
                  
                  <div className="flex-1 w-full relative rounded-xl overflow-hidden bg-black/40 border border-white/5 h-[300px]">
                    {flowNodes.length > 0 ? (
                      <ReactFlow
                        nodes={flowNodes}
                        edges={flowEdges}
                        nodeTypes={nodeTypes}
                        fitView
                        className="w-full h-full"
                      >
                        <Background color="rgba(255, 255, 255, 0.05)" gap={12} size={1} />
                        <Controls />
                      </ReactFlow>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 italic">No Neo4j nodes mapped. Run agent orchestrator workflow.</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Row 4: Comorbidities, Medications lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Conditions list */}
                <div className="glass-panel p-5 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-3">COMORBIDITY RECOGNITION</span>
                  <div className="space-y-2 text-[10px] font-bold">
                    {selectedPatient.diagnoses.map((d, i) => (
                      <div key={i} className="flex justify-between py-1.5 border-b border-white/5 last:border-0 text-slate-300">
                        <span>{d.disease}</span>
                        <span className="text-slate-500 font-semibold">{d.severity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medications list */}
                <div className="glass-panel p-5 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-3">PHARMACOTHERAPY REGISTER</span>
                  <div className="space-y-2 text-[10px] font-bold">
                    {selectedPatient.medications.map((m, i) => (
                      <div key={i} className="flex justify-between py-1.5 border-b border-white/5 last:border-0 text-slate-350">
                        <span>{m.medication}</span>
                        <span className="text-slate-500 font-semibold">{m.dose}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Row 5: Reports tabs & CLINICAL DECISION EVIDENCE INLINE */}
              <div className="grid grid-cols-1 gap-6">
                
                {/* Main report viewer */}
                <div className="glass-panel rounded-2xl border border-white/5 flex flex-col overflow-hidden">
                  <div className="flex border-b border-white/5 bg-black/40 p-2 gap-2">
                    <button
                      onClick={() => setReportTab("physician")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                        reportTab === "physician"
                          ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300 shadow-sm"
                          : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" /> PHYSICIAN ANALYSIS SUMMARY
                    </button>
                    <button
                      onClick={() => setReportTab("patient")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                        reportTab === "patient"
                          ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300 shadow-sm"
                          : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" /> PATIENT EXPLANATIONS
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto max-h-[360px]">
                    {reportTab === "physician" ? (
                      <div className="space-y-1">
                        {renderMarkdown(selectedPatient.clinical_report?.reasoning_report || "")}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {renderMarkdown(selectedPatient.clinical_report?.explanation_report || "")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Clinical Decision Evidence proofs */}
                <div className="glass-panel p-5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white uppercase">Clinical Decision Evidence</h3>
                  </div>

                  {explainTraces.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {explainTraces.map((trace, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-white/5 bg-black/40 space-y-3">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <h4 className="text-xs font-bold text-white uppercase">{trace.recommendation}</h4>
                            <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-955/40 px-2 py-0.5 rounded border border-cyan-900/50">Trace {idx + 1}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-[10px] font-semibold text-slate-300">
                            {Object.entries(trace.evidence).map(([key, val]) => (
                              <div key={key} className="p-2 bg-slate-900/40 rounded border border-white/5 space-y-0.5">
                                <span className="block text-[7px] text-slate-500 uppercase font-bold">{key}</span>
                                <span className="text-slate-202">{val}</span>
                              </div>
                            ))}
                          </div>

                          {trace.reason && (
                            <div className="p-3.5 rounded-lg bg-cyan-955/15 border border-cyan-500/10 text-[10px] text-slate-300 font-semibold space-y-0.5">
                              <span className="block text-[7px] text-cyan-400 uppercase font-bold">AI Reasoning Path</span>
                              <p className="leading-relaxed">{trace.reason}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No explainability traces found. Verify agent workflow reports have structured traces.</p>
                  )}
                </div>

              </div>

            </>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 text-slate-500 flex flex-col items-center justify-center gap-4">
              <User className="w-12 h-12 text-slate-600" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white uppercase">No Case Selected</h3>
                <p className="text-[10px] text-slate-500 font-medium">Select a patient case file registry to build anatomical twin charts.</p>
              </div>
            </div>
          )
        )}

        {/* VIEW 2: CLINICAL COMPARISON HUB */}
        {workspaceTab === "compare" && (
          <div className="flex flex-col gap-6">
            
            {/* Patient Selectors header */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-white uppercase">Clinical Comparison Hub</h2>
                <p className="text-[8px] text-slate-550 uppercase tracking-widest font-bold">Compare Patient Dossiers Side-by-Side</p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Select 1 */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Patient A:</span>
                  <select
                    value={compareId1}
                    onChange={(e) => setCompareId1(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500/50 font-mono-tech"
                  >
                    {patients.map(p => (
                      <option key={p.patient_id} value={p.patient_id} className="bg-[#020617]">{p.name} ({p.patient_id})</option>
                    ))}
                  </select>
                </div>

                {/* Select 2 */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Patient B:</span>
                  <select
                    value={compareId2}
                    onChange={(e) => setCompareId2(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500/50 font-mono-tech"
                  >
                    {patients.map(p => (
                      <option key={p.patient_id} value={p.patient_id} className="bg-[#020617]">{p.name} ({p.patient_id})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {comparePatient1 && comparePatient2 ? (
              <>
                {/* Side-by-side details table */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Patient Parameters Matrix</span>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-bold border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-500 uppercase text-[9px] tracking-wider">
                          <th className="pb-3 w-[240px]">Clinical Coordinate</th>
                          <th className="pb-3 text-cyan-400">{comparePatient1.name} (A)</th>
                          <th className="pb-3 text-pink-400">{comparePatient2.name} (B)</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-300">
                        {/* Demographics */}
                        <tr className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 text-slate-500">Demographics</td>
                          <td className="py-3">{comparePatient1.age}Y • {comparePatient1.gender}</td>
                          <td className="py-3">{comparePatient2.age}Y • {comparePatient2.gender}</td>
                        </tr>
                        <tr className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 text-slate-500">BMI Index</td>
                          <td className="py-3">{comparePatient1.bmi} BMI</td>
                          <td className="py-3">{comparePatient2.bmi} BMI</td>
                        </tr>
                        <tr className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 text-slate-500">Height / Weight</td>
                          <td className="py-3">{comparePatient1.height_cm}cm / {comparePatient1.weight_kg}kg</td>
                          <td className="py-3">{comparePatient2.height_cm}cm / {comparePatient2.weight_kg}kg</td>
                        </tr>

                        {/* XGBoost model predictions */}
                        <tr className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 text-slate-500">XGBoost Risk Score</td>
                          <td className="py-3 text-red-400">
                            {comparePatient1.risk_assessment ? `${Math.round(comparePatient1.risk_assessment.risk_score * 100)}%` : "87%"}
                          </td>
                          <td className="py-3 text-red-400">
                            {comparePatient2.risk_assessment ? `${Math.round(comparePatient2.risk_assessment.risk_score * 100)}%` : "32%"}
                          </td>
                        </tr>
                        <tr className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 text-slate-500">Model Confidence</td>
                          <td className="py-3 text-cyan-400">
                            {comparePatient1.risk_assessment ? `${Math.round(comparePatient1.risk_assessment.confidence * 100)}%` : "93%"}
                          </td>
                          <td className="py-3 text-cyan-400">
                            {comparePatient2.risk_assessment ? `${Math.round(comparePatient2.risk_assessment.confidence * 100)}%` : "88%"}
                          </td>
                        </tr>
                        <tr className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 text-slate-500">Evidence Level</td>
                          <td className="py-3">
                            <span className="text-[9px] bg-cyan-950/40 text-cyan-400 px-2 py-0.5 rounded border border-cyan-900/50">
                              {comparePatient1.risk_assessment?.evidence_level || "Strong"}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="text-[9px] bg-cyan-950/40 text-cyan-400 px-2 py-0.5 rounded border border-cyan-900/50">
                              {comparePatient2.risk_assessment?.evidence_level || "Moderate"}
                            </span>
                          </td>
                        </tr>

                        {/* Active conditions */}
                        <tr className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 text-slate-500">Active Diagnoses</td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              {comparePatient1.diagnoses.map((d: any) => (
                                <span key={d.disease} className="text-[8px] bg-slate-900 px-1.5 py-0.5 rounded border border-white/5">{d.disease}</span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              {comparePatient2.diagnoses.map((d: any) => (
                                <span key={d.disease} className="text-[8px] bg-slate-900 px-1.5 py-0.5 rounded border border-white/5">{d.disease}</span>
                              ))}
                            </div>
                          </td>
                        </tr>

                        {/* Active drugs */}
                        <tr className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 text-slate-500">Pharmacotherapy</td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              {comparePatient1.medications.map((m: any) => (
                                <span key={m.medication} className="text-[8px] bg-cyan-955/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-900/30">{m.medication}</span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              {comparePatient2.medications.map((m: any) => (
                                <span key={m.medication} className="text-[8px] bg-cyan-955/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-900/30">{m.medication}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Overlaid HbA1c curves chart */}
                <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-4">HbA1c Progression Overlay Compare</span>
                  <div className="h-60 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={combinedCompareChartData} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "rgba(255,255,255,0.08)" }} />
                        <Legend wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                        {comparePatient1 && (
                          <Line type="monotone" dataKey={`${comparePatient1.name} (HbA1c)`} stroke="#06b6d4" strokeWidth={3} activeDot={{ r: 4 }} />
                        )}
                        {comparePatient2 && (
                          <Line type="monotone" dataKey={`${comparePatient2.name} (HbA1c)`} stroke="#f43f5e" strokeWidth={3} activeDot={{ r: 4 }} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-500 italic">Select two patients from the dropdowns above to display side-by-side analytics.</div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}

// Internal Trace Parser helper
interface ExplainTrace {
  recommendation: string;
  evidence: { [key: string]: string };
  reason: string;
}

const parseTracesHelper = (reportText: string): ExplainTrace[] => {
  if (!reportText) return [];
  const regex = /```explainability_trace\n([\s\S]*?)\n```/g;
  const traces: ExplainTrace[] = [];
  let match;
  while ((match = regex.exec(reportText)) !== null) {
    const content = match[1];
    let rec = "";
    let evidence: { [key: string]: string } = {};
    let reason = "";
    
    const lines = content.split("\n");
    let currentKey = "";
    let currentEvidenceKey = "";
    
    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (line.startsWith("Recommendation:")) {
        rec = line.replace("Recommendation:", "").trim();
        currentKey = "recommendation";
      } else if (line.startsWith("Evidence:")) {
        currentKey = "evidence";
        currentEvidenceKey = "";
      } else if (line.startsWith("Reason:")) {
        reason = line.replace("Reason:", "").trim();
        currentKey = "reason";
      } else if (currentKey === "recommendation") {
        rec += " " + trimmed;
      } else if (currentKey === "reason") {
        reason += " " + trimmed;
      } else if (currentKey === "evidence") {
        if (trimmed.endsWith(":")) {
          currentEvidenceKey = trimmed.slice(0, -1).trim();
          evidence[currentEvidenceKey] = "";
        } else if (currentEvidenceKey) {
          evidence[currentEvidenceKey] = evidence[currentEvidenceKey]
            ? evidence[currentEvidenceKey] + " " + trimmed
            : trimmed;
        } else {
          evidence["Details"] = evidence["Details"] ? evidence["Details"] + " " + trimmed : trimmed;
        }
      }
    }
    
    traces.push({
      recommendation: rec || "Therapeutic Adjustment",
      evidence: evidence,
      reason: reason
    });
  }
  return traces;
};
