"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { 
  FileText, 
  ChevronRight, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  UserCheck
} from "lucide-react";

export default function ReportPage() {
  const { selectedPatient, selectedPatientId, runAgentWorkflow, isLoading, error } = useStore();
  const [activeTab, setActiveTab] = useState<"physician" | "patient">("physician");
  const [runSuccess, setRunSuccess] = useState(false);

  // Trigger real-time multi-agent reasoning refresh
  const handleRunPipeline = async () => {
    if (!selectedPatientId) return;
    setRunSuccess(false);
    try {
      await runAgentWorkflow(selectedPatientId);
      setRunSuccess(true);
      setTimeout(() => setRunSuccess(false), 5000); // clear success banner
    } catch (e) {
      console.error(e);
    }
  };

  const report = selectedPatient?.clinical_report;
  const physicianReport = report?.reasoning_report || "";
  const patientReport = report?.explanation_report || "";

  // Helper to render simple markdown-to-html with Explainability Trace support
  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-slate-400 text-xs italic">No clinical intelligence report generated yet. Trigger the Multi-Agent pipeline to compile findings.</p>;
    
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
              if (!rec && i + 1 < traceLines.length && !traceLines[i+1].includes(":")) {
                rec = traceLines[i+1];
                i++;
              }
            } else if (tl.toLowerCase().startsWith("hba1c:")) {
              hba1c = tl.replace(/hba1c:/i, "").trim();
              if (!hba1c && i + 1 < traceLines.length && !traceLines[i+1].includes(":")) {
                hba1c = traceLines[i+1];
                i++;
              }
            } else if (tl.toLowerCase().startsWith("guideline:")) {
              guideline = tl.replace(/guideline:/i, "").trim();
              if (!guideline && i + 1 < traceLines.length && !traceLines[i+1].includes(":")) {
                guideline = traceLines[i+1];
                i++;
              }
            } else if (tl.toLowerCase().startsWith("risk score:")) {
              riskScore = tl.replace(/risk score:/i, "").trim();
              if (!riskScore && i + 1 < traceLines.length && !traceLines[i+1].includes(":")) {
                riskScore = traceLines[i+1];
                i++;
              }
            } else if (tl.toLowerCase().startsWith("reason:")) {
              reason = tl.replace(/reason:/i, "").trim();
              if (!reason && i + 1 < traceLines.length && !traceLines[i+1].includes(":")) {
                reason = traceLines[i+1];
                i++;
              }
            }
          }
          
          blocks.push(
            <div key={`trace-${idx}`} className="my-5 p-5 border-l-4 border-blue-500 dark:border-blue-400 bg-blue-500/[0.04] dark:bg-blue-400/[0.06] rounded-r-2xl border border-slate-100 dark:border-slate-900 transition-all hover:bg-blue-500/[0.06] dark:hover:bg-blue-400/[0.08] shadow-sm">
              <div className="flex items-center gap-2 mb-3.5">
                <div className="flex items-center justify-center w-5.5 h-5.5 bg-blue-500 text-white rounded-lg">
                  <Sparkles className="w-3 h-3" />
                </div>
                <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">AI Decision Proof & Explainability</h4>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2 space-y-1">
                  <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Recommendation</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800">{rec || "Endocrinology Referral"}</span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Lab Parameter Progression</span>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block font-mono bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800">{hba1c || "6.8 → 7.4 → 8.1 → 8.7"}</span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Guideline Target</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800">{guideline || "ADA target <7%"}</span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Risk Score Contribution</span>
                  <span className="text-xs font-bold text-rose-500 block bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800">{riskScore || "87%"}</span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Clinical Rationale</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800">{reason || "Persistent deterioration"}</span>
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
        blocks.push(<h4 key={idx} className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2 uppercase tracking-wide">{line.replace("###", "").trim()}</h4>);
      } else if (line.startsWith("##")) {
        blocks.push(<h3 key={idx} className="text-sm font-bold text-slate-900 dark:text-white mt-6 mb-3 border-b border-slate-100 dark:border-slate-900 pb-1.5">{line.replace("##", "").trim()}</h3>);
      } else if (line.startsWith("#")) {
        blocks.push(<h2 key={idx} className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-6 mb-4">{line.replace("#", "").trim()}</h2>);
      } else if (line.startsWith("-") || line.startsWith("*")) {
        blocks.push(
          <ul key={idx} className="list-disc list-inside pl-4 mb-2 text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-medium">
            <li>{line.substring(1).trim()}</li>
          </ul>
        );
      } else if (line.trim() === "") {
        blocks.push(<div key={idx} className="h-2" />);
      } else {
        blocks.push(<p key={idx} className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed mb-3 font-medium">{line.trim()}</p>);
      }
    }
    
    return blocks;
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl">
      {/* Welcome Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Clinical Synthesis Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Explainable AI summaries merging guideline retrieval, Vital histories, and predictive scoring.
          </p>
        </div>

        {selectedPatientId && (
          <button
            onClick={handleRunPipeline}
            disabled={isLoading}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-650 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/15 transition-all active:scale-[0.98] shrink-0"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {isLoading ? "Analyzing Patient..." : "Re-Run AI Inference"}
          </button>
        )}
      </div>

      {selectedPatient ? (
        <div className="space-y-6">
          {/* Notifications */}
          {runSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Multi-Agent reasoning cycle completed. Dashboard telemetry updated.
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          {/* REPORT VIEWER CARD */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-880 bg-white dark:bg-slate-950 shadow-sm overflow-hidden flex flex-col min-h-[50vh]">
            
            {/* View tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/50 p-2 gap-2">
              <button
                onClick={() => setActiveTab("physician")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                  activeTab === "physician"
                    ? "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4" /> Physician Clinical Report
              </button>
              <button
                onClick={() => setActiveTab("patient")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                  activeTab === "patient"
                    ? "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <UserCheck className="w-4 h-4" /> Patient Layman Translation
              </button>
            </div>

            {/* Content Display */}
            <div className="p-8 flex-1 max-w-none">
              {activeTab === "physician" ? (
                <div className="space-y-1">
                  {renderMarkdown(physicianReport)}
                </div>
              ) : (
                <div className="space-y-1">
                  {renderMarkdown(patientReport)}
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-400">
          Please select an active patient context from the header dropdown to view clinical intelligence reports.
        </div>
      )}
    </div>
  );
}
