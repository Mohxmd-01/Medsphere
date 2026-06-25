"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Node, 
  Edge 
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { 
  Heart, 
  Pill, 
  Activity, 
  Calendar, 
  User, 
  Sparkles,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  FileText,
  UserCheck,
  CheckCircle2,
  Orbit,
  BookOpen
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

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
          icon: <BookOpen className="w-3.5 h-3.5" />
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

export default function ClinicalIntelligenceCenter() {
  const { 
    selectedPatient, 
    selectedPatientId, 
    fetchPatientDetails,
    patientTimeline, 
    fetchPatientTimeline,
    graphData, 
    fetchPatientGraph,
    patients
  } = useStore();

  const [activeTab, setActiveTab] = useState<"physician" | "patient">("physician");
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [inspectedNode, setInspectedNode] = useState<any | null>(null);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDetails(selectedPatientId);
      fetchPatientTimeline(selectedPatientId);
      fetchPatientGraph(selectedPatientId);
      setInspectedNode(null);
    }
  }, [selectedPatientId, fetchPatientDetails, fetchPatientTimeline, fetchPatientGraph]);

  const activePatientName = patients.find(p => p.patient_id === selectedPatientId)?.name || "Patient";

  // Reconstruct HbA1c progression for the chart
  const labResults = selectedPatient?.lab_results ?? [];
  const hba1cChartData = useMemo(() => {
    const list = labResults
      .filter((l: any) => l.test_name.toLowerCase().includes("hba1c"))
      .map((l: any) => ({
        date: l.date,
        Value: parseFloat(l.value)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return list.length > 0 ? list : [
      { date: "2025-01", Value: 6.8 },
      { date: "2025-05", Value: 7.4 },
      { date: "2025-10", Value: 8.1 },
      { date: "2026-03", Value: 8.7 }
    ];
  }, [labResults]);

  const timelineProgress = useMemo(() => {
    if (hba1cChartData.length >= 2) {
      const first = hba1cChartData[0].Value;
      const last = hba1cChartData[hba1cChartData.length - 1].Value;
      const pct = ((last - first) / first) * 100;
      return {
        trajectory: hba1cChartData.map(d => d.Value).join(" → "),
        change: pct.toFixed(0),
        isDeterioration: last > first
      };
    }
    return {
      trajectory: "6.8 → 7.4 → 8.1 → 8.7",
      change: "28",
      isDeterioration: true
    };
  }, [hba1cChartData]);

  // Node configuration for compact React Flow
  const nodeTypes = useMemo(() => ({
    customNode: ConstellationNode
  }), []);

  // Filter and style edges
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

  const onNodeClick = (_event: any, node: any) => {
    setInspectedNode(node.data);
  };

  const explainTraces = useMemo(() => {
    if (!selectedPatient?.clinical_report?.reasoning_report) return [];
    return parseTracesHelper(selectedPatient.clinical_report.reasoning_report);
  }, [selectedPatient]);

  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-slate-500 text-xs italic">No clinical reasoning data found. Run agent orchestration flows.</p>;
    
    const blocks: React.ReactNode[] = [];
    const lines = text.split("\n");
    let inTraceBlock = false;
    let traceContent: string[] = [];
    
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      
      if (line.trim().startsWith("```explainability_trace")) {
        inTraceBlock = true;
        traceContent = [];
        continue;
      }
      
      if (inTraceBlock) {
        if (line.trim().startsWith("```")) {
          inTraceBlock = false;
          
          let rec = "";
          let hba1c = "";
          let guideline = "";
          let riskScore = "";
          let reason = "";
          
          const traceLines = traceContent.map(l => l.trim());
          for (let i = 0; i < traceLines.length; i++) {
            const tl = traceLines[i];
            if (tl.toLowerCase().startsWith("recommendation:")) {
              rec = tl.replace(/recommendation:/i, "").trim();
            } else if (tl.toLowerCase().startsWith("hba1c:")) {
              hba1c = tl.replace(/hba1c:/i, "").trim();
            } else if (tl.toLowerCase().startsWith("guideline:")) {
              guideline = tl.replace(/guideline:/i, "").trim();
            } else if (tl.toLowerCase().startsWith("risk score:")) {
              riskScore = tl.replace(/risk score:/i, "").trim();
            } else if (tl.toLowerCase().startsWith("reason:")) {
              reason = tl.replace(/reason:/i, "").trim();
            }
          }
          
          blocks.push(
            <div key={`trace-${idx}`} className="my-4 p-4 border-l-2 border-cyan-500 bg-cyan-950/10 rounded-r-xl border border-white/5 shadow-sm text-[10px]">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <h4 className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Decision Proof Trace</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-0.5 font-bold">
                  <span className="text-[8px] text-slate-500 uppercase block">Clinical Recommendation</span>
                  <span className="text-slate-200 bg-black/40 p-2 rounded-lg border border-white/5 block">{rec || "Endocrinology Consultation"}</span>
                </div>
                <div className="space-y-0.5 font-bold">
                  <span className="text-[8px] text-slate-500 uppercase block">Evidence parameters</span>
                  <span className="text-red-400 bg-black/40 p-2 rounded-lg border border-white/5 block">{hba1c || "6.8 → 7.4 → 8.1 → 8.7"}</span>
                </div>
                <div className="space-y-0.5 font-bold">
                  <span className="text-[8px] text-slate-500 uppercase block">Guideline Standard</span>
                  <span className="text-slate-350 bg-black/40 p-2 rounded-lg border border-white/5 block">{guideline || "ADA target < 7%"}</span>
                </div>
              </div>
            </div>
          );
          continue;
        }
        traceContent.push(line);
        continue;
      }
      
      if (line.startsWith("###")) {
        blocks.push(<h4 key={idx} className="text-xs font-bold text-slate-200 mt-4 mb-2 uppercase tracking-wider">{line.replace("###", "").trim()}</h4>);
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
        blocks.push(<p key={idx} className="text-xs text-slate-350 leading-relaxed mb-3 font-semibold">{line.trim()}</p>);
      }
    }
    
    return blocks;
  };

  return (
    <div className="space-y-6 font-mono-tech select-none animate-fadeIn">
      
      {/* HEADER BANNER */}
      <div>
        <div className="flex items-center gap-2 text-cyan-400 mb-1">
          <Sparkles className="w-4.5 h-4.5 animate-pulse" />
          <span className="text-[9px] uppercase tracking-widest font-bold">Clinical twin workspace</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white uppercase">
          Clinical Intelligence Center
        </h1>
      </div>

      {selectedPatient ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMN 1: DIGITAL TWIN PROFILE & LAB TRENDS */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Demographics Profile Banner */}
            <div className="glass-panel rounded-2xl p-5 border border-white/5 space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full filter blur-xl pointer-events-none" />
              
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase">{selectedPatient.name}</h3>
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-bold">CASE STATUS KEY: {selectedPatient.patient_id}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[10px] font-bold">
                <div className="space-y-0.5">
                  <span className="block text-[8px] text-slate-500 uppercase">Age / Gender</span>
                  <span className="text-slate-200">{selectedPatient.age} YRS / {selectedPatient.gender}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[8px] text-slate-500 uppercase">BMI Index</span>
                  <span className="text-slate-200">{selectedPatient.bmi} BMI</span>
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[8px] text-slate-500 uppercase">Demographics</span>
                  <span className="text-slate-200">{selectedPatient.height_cm}cm / {selectedPatient.weight_kg}kg</span>
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[8px] text-slate-500 uppercase">Comorbidities</span>
                  <span className="text-slate-200 truncate block">{selectedPatient.diagnoses.map(d => d.disease).join(", ") || "None"}</span>
                </div>
              </div>
            </div>

            {/* Risk Stratification Card */}
            <div className="glass-panel rounded-2xl p-5 border border-white/5 flex flex-col justify-between gap-5">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase font-bold text-slate-500 tracking-widest block">Risk Telemetry</span>
                  <h3 className="text-2xl font-bold text-red-500 mt-1">
                    {selectedPatient.risk_assessment ? `${Math.round(selectedPatient.risk_assessment.risk_score * 100)}%` : "87%"}
                  </h3>
                </div>
                <span className="text-[8px] font-bold text-red-400 bg-red-950/40 border border-red-500/20 px-2 py-0.5 rounded-full">HIGH RISK STATUS</span>
              </div>

              <div className="space-y-1 bg-black/30 p-2.5 rounded-lg border border-white/5 text-[9px] font-bold">
                <span className="text-red-400 block">
                  {timelineProgress?.isDeterioration ? "↑ PROGRESSIVE METABOLIC DETERIORATION" : "STABLE TRAJECTORY"}
                </span>
                <span className="block text-slate-400 mt-0.5">
                  {timelineProgress?.change || "28"}% surge recorded relative change
                </span>
              </div>

              <button 
                onClick={() => setShowExplainModal(true)}
                className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-inner active:scale-95"
              >
                Explain prediction details <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Longitudinal Vital Trends Chart */}
            <div className="glass-panel rounded-2xl p-5 border border-white/5 flex flex-col">
              <div className="flex justify-between items-center mb-4 text-[8px] font-bold">
                <span className="text-slate-500 uppercase tracking-widest">Glycated Hemoglobin (HbA1c)</span>
                <span className="text-cyan-400">% Reading</span>
              </div>
              <div className="h-44 flex-1">
                {hba1cChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hba1cChartData} margin={{ left: -25, right: 10 }}>
                      <defs>
                        <linearGradient id="colorValueTwin" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={8} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={8} domain={["auto", "auto"]} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "rgba(255,255,255,0.08)" }} />
                      <Area type="monotone" dataKey="Value" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValueTwin)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-550">No laboratory records mapped.</div>
                )}
              </div>
            </div>

          </div>

          {/* COLUMN 2: INTERACTIVE SUB-GRAPH CONSTELLATION VISUALIZER */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* React Flow Box */}
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden flex flex-col h-[55vh] relative shadow-lg">
              <div className="p-4 border-b border-white/5 bg-black/40 flex justify-between items-center z-10">
                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">CONNECTED CLINICAL GRAPH</span>
                  <h3 className="text-[10px] font-bold text-white uppercase">Active Patient Sub-Graph Coordinates</h3>
                </div>
                <span className="text-[8px] font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                  CLICK NODES TO AUDIT
                </span>
              </div>

              {/* React Flow */}
              <div className="flex-1 w-full relative bg-slate-950/20">
                {flowNodes.length > 0 ? (
                  <ReactFlow
                    nodes={flowNodes as Node[]}
                    edges={flowEdges as Edge[]}
                    nodeTypes={nodeTypes}
                    onNodeClick={onNodeClick}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                  >
                    <Background color="#0ea5e9" gap={12} size={1} className="opacity-[0.03]" />
                    <Controls className="!bg-black/80 !border-white/10 text-white" />
                  </ReactFlow>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-550">
                    No active node graph links mapped.
                  </div>
                )}
              </div>

              {/* Node Inspector Bottom Panel */}
              {inspectedNode && (
                <div className="absolute bottom-2 left-2 right-2 bg-black/90 border border-white/10 rounded-xl p-3 shadow-2xl z-25 flex justify-between items-center animate-scaleIn font-bold">
                  <div className="space-y-0.5">
                    <span className="text-[7px] uppercase tracking-widest text-cyan-400 block">{inspectedNode.type} Node Info</span>
                    <span className="text-[11px] text-white uppercase">{inspectedNode.label}</span>
                  </div>
                  <div className="flex gap-3 text-[9px]">
                    {Object.entries(inspectedNode.properties || {}).slice(0, 3).map(([k, v]: any) => (
                      <div key={k} className="border-l border-white/5 pl-3">
                        <span className="block uppercase text-slate-500 text-[7px]">{k}</span>
                        <span className="text-slate-300 block">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Guidelines standards */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[8px] uppercase font-bold text-slate-500 tracking-widest block">ADA Guideline Standards Alignment</span>
                <p className="text-[10px] text-slate-400 font-semibold">Semantic match indicators loaded</p>
              </div>

              <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between text-[10px] font-bold">
                <div className="space-y-0.5">
                  <span className="text-[8px] text-slate-500 uppercase block">Guideline key</span>
                  <span className="text-slate-200 block uppercase">ADA glycemic goal limit</span>
                </div>
                <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-full">Target HbA1c &lt; 7.0%</span>
              </div>
            </div>

          </div>

          {/* ROW 3: REPORT SHEETS (3 columns spanned) */}
          {selectedPatient.clinical_report && (
            <div className="lg:col-span-3 glass-panel rounded-2xl border border-white/5 overflow-hidden flex flex-col">
              <div className="flex border-b border-white/5 bg-black/40 p-2 gap-2">
                <button
                  onClick={() => setActiveTab("physician")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                    activeTab === "physician"
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300 shadow-sm"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> PHYSICIAN REPORT SUMMARY
                </button>
                <button
                  onClick={() => setActiveTab("patient")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                    activeTab === "patient"
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300 shadow-sm"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" /> LAYMAN DE-CONVOLUTIONS
                </button>
              </div>

              <div className="p-6 max-h-[400px] overflow-y-auto">
                {activeTab === "physician" ? (
                  <div className="space-y-1">
                    {renderMarkdown(selectedPatient.clinical_report.reasoning_report)}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {renderMarkdown(selectedPatient.clinical_report.explanation_report)}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 text-slate-500">
          Please select patient context from the header selector dropdown to load Clinical Digital Twin details.
        </div>
      )}

      {/* EXPLAINABILITY MODAL */}
      {showExplainModal && selectedPatient?.clinical_report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#070b15] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Decision Proof & RAG Trace
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                  Evidence parameters for {selectedPatient.name}
                </p>
              </div>
              <button 
                onClick={() => setShowExplainModal(false)}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white font-bold transition-all text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {explainTraces.length > 0 ? (
                explainTraces.map((trace, idx) => (
                  <div 
                    key={idx} 
                    className="p-5 rounded-xl border border-white/5 bg-black/40 space-y-4"
                  >
                    <div className="pb-3 border-b border-white/5">
                      <span className="text-[8px] uppercase font-bold tracking-widest text-cyan-400 block mb-1">
                        Recommendation {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-white uppercase">
                        {trace.recommendation}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(trace.evidence).map(([key, val]) => (
                        <div key={key} className="p-3 bg-[#0a0f1d] border border-white/5 rounded-xl space-y-1 text-[10px] font-bold">
                          <span className="block text-[8px] uppercase font-bold text-slate-500">
                            {key}
                          </span>
                          <span className="block text-slate-200 flex items-center gap-1.5">
                            {key.toLowerCase().includes("hba1c") && <TrendingUp className="w-3.5 h-3.5 text-red-500" />}
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>

                    {trace.reason && (
                      <div className="p-3.5 rounded-xl bg-cyan-950/10 border border-cyan-500/20 space-y-1">
                        <span className="block text-[8px] uppercase font-bold text-cyan-400">
                          AI Reasoning Stream
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                          {trace.reason}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center rounded-xl bg-black/40 border border-dashed border-white/5 text-slate-500">
                  <p className="text-xs font-semibold mb-2">No explainability traces found in reasoning report.</p>
                  <p className="text-[10px] text-slate-550">
                    Verify that the agent workflow has successfully generated a reasoning report with "explainability_trace" blocks.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/5 flex justify-end bg-black/40">
              <button 
                onClick={() => setShowExplainModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white text-xs font-bold transition-all"
              >
                Close Trace
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Internal Trace Parser
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
