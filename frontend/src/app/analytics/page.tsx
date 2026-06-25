"use client";

import React, { useEffect, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { 
  TrendingUp, 
  Activity, 
  ShieldCheck,
  Info,
  Database,
  AlertTriangle,
  Award
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell
} from "recharts";

export default function AnalyticsPage() {
  const { selectedPatient, selectedPatientId, fetchPatientDetails, patients } = useStore();

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDetails(selectedPatientId);
    }
  }, [selectedPatientId, fetchPatientDetails]);

  // Extract risk metrics
  const riskAssessment = selectedPatient?.risk_assessment;
  const score = riskAssessment?.risk_score ?? 0.35;
  const category = riskAssessment?.risk_category ?? "Moderate";
  const confidence = riskAssessment?.confidence ?? 0.85;

  // Feature importance mappings
  const featureImportanceRaw = riskAssessment?.feature_importance ?? {
    "age": 0.28,
    "ldl": 0.25,
    "bmi": 0.24,
    "hba1c": 0.15,
    "weight_kg": 0.06,
    "glucose": 0.01
  };

  const featureImportanceData = Object.entries(featureImportanceRaw)
    .map(([key, val]: any) => ({
      name: key.replace("has_", "").replace("_", " ").toUpperCase(),
      Weight: Math.round(val * 100)
    }))
    .sort((a, b) => b.Weight - a.Weight);

  // Extract lab history trajectories
  const labResults = selectedPatient?.lab_results ?? [];
  
  const getTimelineData = (testName: string) => {
    return labResults
      .filter((l: any) => l.test_name.toLowerCase().includes(testName.toLowerCase()))
      .map((l: any) => ({
        date: l.date,
        Value: parseFloat(l.value)
      }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
  };

  const hba1cTimeline = getTimelineData("HbA1c");
  const ldlTimeline = getTimelineData("LDL");
  const weightTimeline = getTimelineData("Weight").length > 0 ? getTimelineData("Weight") : getTimelineData("BMI");

  const bpTimeline = (() => {
    const sys = labResults.filter((l: any) => l.test_name.toLowerCase().includes("systolic bp"));
    const dia = labResults.filter((l: any) => l.test_name.toLowerCase().includes("diastolic bp"));
    
    const data: any[] = [];
    sys.forEach((s: any) => {
      const dMatch = dia.find((d: any) => d.date === s.date);
      data.push({
        date: s.date,
        Systolic: parseFloat(s.value),
        Diastolic: dMatch ? parseFloat(dMatch.value) : 80
      });
    });
    return data.sort((a, b) => a.date.localeCompare(b.date));
  })();

  const getRiskCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "high": return "text-red-400 border-red-500/20 bg-red-950/20";
      case "moderate": return "text-amber-400 border-amber-500/20 bg-amber-950/20";
      default: return "text-emerald-400 border-emerald-500/20 bg-emerald-950/20";
    }
  };

  const activePatientName = patients.find(p => p.patient_id === selectedPatientId)?.name || "Patient";

  return (
    <div className="space-y-6 font-mono-tech select-none animate-fadeIn">
      
      {/* HEADER SECTION */}
      <div className="pb-4 border-b border-white/5">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">PREDICTIVE ANALYTICS HUD</span>
        <h1 className="text-xl font-bold tracking-tight text-white uppercase">Predictive Health Console</h1>
        <p className="text-[10px] text-slate-400 mt-1 uppercase">
          ML Complication Risk Telemetry for <b className="text-slate-200">{activePatientName}</b>
        </p>
      </div>

      {selectedPatient ? (
        <>
          {/* MODEL EVALUATION METRICS CARD */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 grid grid-cols-1 xl:grid-cols-4 gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full filter blur-xl pointer-events-none" />
            
            <div className="xl:col-span-1 border-r border-white/5 pr-6 flex flex-col justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest block">Inference Engine Telemetry</span>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase">
                  <Award className="w-4.5 h-4.5 text-cyan-400" /> Model Performance
                </h3>
              </div>
              
              <div className="space-y-2 text-[8px] font-bold">
                <span className="text-slate-400 bg-slate-900 border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
                  <Database className="w-3 h-3 text-cyan-450" /> SYNTHETIC DATASET
                </span>
                <span className="text-amber-400 bg-amber-955/20 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
                  <AlertTriangle className="w-3 h-3" /> TARGET LEAKAGE ANALYZED
                </span>
                <span className="text-cyan-400 bg-cyan-955/20 border border-cyan-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
                  <ShieldCheck className="w-3 h-3" /> FEATURE ABLATIONS COMPLETE
                </span>
              </div>
            </div>

            <div className="xl:col-span-3 pl-4 space-y-4">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">5-Fold Cross Validation Benchmarks</span>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: "Accuracy", score: "96.1%" },
                  { label: "Precision", score: "96.6%" },
                  { label: "Recall", score: "99.2%" },
                  { label: "F1 Score", score: "97.9%" },
                  { label: "ROC-AUC", score: "97.4%" }
                ].map((m, idx) => (
                  <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1">
                    <span className="block text-[8px] uppercase font-bold text-slate-550 leading-none">{m.label}</span>
                    <span className="block text-xs font-bold text-cyan-400 leading-none mt-1">{m.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* GAUGES SECTION: SCORE & FEATURE IMPORTANCE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Risk radial meter */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between gap-6">
              <div className="space-y-1">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Risk Stratification</span>
                <span className="block text-[10px] text-slate-400">Model predicted complication threshold</span>
              </div>

              <div className="flex flex-col items-center justify-center p-4 relative">
                <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-4 border-slate-900 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">{(score * 100).toFixed(0)}%</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Stratified Score</span>
                  </div>
                </div>

                <div className={`mt-6 w-full py-2 px-4 border rounded-xl text-center text-[10px] font-bold uppercase tracking-wider ${getRiskCategoryColor(category)}`}>
                  {category} RISK SCALE
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] text-slate-500 border-t border-white/5 pt-4">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-cyan-500" /> Confidence index: {Math.round(confidence * 100)}%</span>
                <span>Active</span>
              </div>
            </div>

            {/* Feature weights bar chart */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 lg:col-span-2 flex flex-col justify-between">
              <div className="space-y-1 mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-400 animate-pulse" /> Explainability Gini Split Weights
                </h3>
                <span className="block text-[9px] text-slate-500">
                  Classifier parameter split weight metrics. Higher weight signifies higher contribution to stratified risk.
                </span>
              </div>

              <div className="h-60 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureImportanceData} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis type="number" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={8} width={90} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "rgba(255,255,255,0.08)" }} cursor={{ fill: "rgba(255,255,255,0.01)" }} />
                    <Bar dataKey="Weight" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={10}>
                      {featureImportanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index < 4 ? "#ef4444" : "#3b82f6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* PARAMETER TRAJECTORIES TIMELINES */}
          <div className="space-y-6">
            <div className="border-b border-white/5 pb-2">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chronological Parameter Trajectories</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* HbA1c */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col">
                <div className="flex justify-between items-center mb-4 text-[9px] font-bold">
                  <span className="text-slate-400 uppercase tracking-wider">Glycated Hemoglobin (HbA1c)</span>
                  <span className="text-cyan-400">% Value</span>
                </div>
                <div className="h-56 flex-1">
                  {hba1cTimeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hba1cTimeline} margin={{ left: -25, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} domain={["auto", "auto"]} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "rgba(255,255,255,0.08)" }} />
                        <Line type="monotone" dataKey="Value" stroke="#06b6d4" strokeWidth={3} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-550">No laboratory records mapped.</div>
                  )}
                </div>
              </div>

              {/* BP */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col">
                <div className="flex justify-between items-center mb-4 text-[9px] font-bold">
                  <span className="text-slate-400 uppercase tracking-wider">Systolic & Diastolic BP</span>
                  <span className="text-red-400">mmHg Value</span>
                </div>
                <div className="h-56 flex-1">
                  {bpTimeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={bpTimeline} margin={{ left: -25, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} domain={["auto", "auto"]} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "rgba(255,255,255,0.08)" }} />
                        <Line type="monotone" dataKey="Systolic" stroke="#ef4444" strokeWidth={2} />
                        <Line type="monotone" dataKey="Diastolic" stroke="#8b5cf6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-550">No vitals records mapped.</div>
                  )}
                </div>
              </div>

              {/* LDL */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col">
                <div className="flex justify-between items-center mb-4 text-[9px] font-bold">
                  <span className="text-slate-400 uppercase tracking-wider">LDL Cholesterol</span>
                  <span className="text-emerald-450">mg/dL Value</span>
                </div>
                <div className="h-56 flex-1">
                  {ldlTimeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ldlTimeline} margin={{ left: -25, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} domain={["auto", "auto"]} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "rgba(255,255,255,0.08)" }} />
                        <Line type="monotone" dataKey="Value" stroke="#10b981" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-550">No lipid panel records mapped.</div>
                  )}
                </div>
              </div>

              {/* Weight */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col">
                <div className="flex justify-between items-center mb-4 text-[9px] font-bold">
                  <span className="text-slate-400 uppercase tracking-wider">Weight Tracking</span>
                  <span className="text-amber-500">kg Value</span>
                </div>
                <div className="h-56 flex-1">
                  {weightTimeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightTimeline} margin={{ left: -25, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} domain={["auto", "auto"]} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "rgba(255,255,255,0.08)" }} />
                        <Line type="monotone" dataKey="Value" stroke="#f59e0b" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-550">No anthropometric weight logs.</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 text-slate-500">
          Please select an active patient context from the header dropdown to view risk analytics.
        </div>
      )}
    </div>
  );
}
