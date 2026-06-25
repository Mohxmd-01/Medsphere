"use client";

import React, { useState } from "react";
import { useStore } from "@/store/useStore";
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  FileCheck,
  Cpu,
  ArrowRight,
  FileText,
  UserCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";

export default function UploadPage() {
  const { uploadDocument, isLoading, error, clearError } = useStore();
  
  const [file, setFile] = useState<File | null>(null);
  const [outcome, setOutcome] = useState<any | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [reportTab, setReportTab] = useState<"physician" | "patient">("physician");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setOutcome(null);
      clearError();
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploadProgress(true);
    setOutcome(null);
    clearError();

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await uploadDocument(formData);
      setOutcome(res);
      setFile(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadProgress(false);
    }
  };

  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-slate-500 text-xs italic">No clinical intelligence report generated.</p>;
    
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
          
          const traceLines = traceContent.map(l => l.trim());
          for (let i = 0; i < traceLines.length; i++) {
            const tl = traceLines[i];
            if (tl.toLowerCase().startsWith("recommendation:")) {
              rec = tl.replace(/recommendation:/i, "").trim();
            } else if (tl.toLowerCase().startsWith("hba1c:")) {
              hba1c = tl.replace(/hba1c:/i, "").trim();
            } else if (tl.toLowerCase().startsWith("guideline:")) {
              guideline = tl.replace(/guideline:/i, "").trim();
            }
          }
          
          blocks.push(
            <div key={`trace-${idx}`} className="my-4 p-4 border-l-2 border-cyan-500 bg-cyan-950/10 rounded-r-xl border border-white/5 shadow-sm text-[10px] font-bold">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <h4 className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Decision Proof Trace</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-0.5">
                  <span className="text-[8px] text-slate-500 uppercase block">Recommendation</span>
                  <span className="text-slate-200 bg-black/40 p-2 rounded-lg border border-white/5 block">{rec || "Therapeutic adjustment"}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] text-slate-500 uppercase block">Lab Evidence</span>
                  <span className="text-red-400 bg-black/40 p-2 rounded-lg border border-white/5 block">{hba1c || "HbA1c = 8.7%"}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] text-slate-500 uppercase block">Standard guidelines</span>
                  <span className="text-slate-350 bg-black/40 p-2 rounded-lg border border-white/5 block">{guideline || "ADA targets < 7%"}</span>
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
      
      {/* HEADER WELCOME */}
      <div className="pb-4 border-b border-white/5">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">DOCUMENT INGESTION GATEWAY</span>
        <h1 className="text-xl font-bold tracking-tight text-white uppercase">Clinical Record Ingestion</h1>
        <p className="text-[10px] text-slate-400 mt-1 uppercase">
          Upload unstructured diagnostic summaries (PDF, DOCX, or TXT summaries) to execute OCR and agent triggers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* UPLOAD FORM PANEL (3 columns) */}
        <div className="lg:col-span-3 glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-6">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Ingestion Interface Terminal</span>
          
          <form onSubmit={handleUploadSubmit} className="space-y-6">
            
            {/* File Drag Box */}
            <div className="border border-dashed border-white/10 hover:border-cyan-500/50 rounded-2xl p-8 text-center bg-black/40 relative group cursor-pointer transition-all duration-250">
              <input 
                type="file" 
                onChange={handleFileChange}
                accept=".txt,.pdf,.docx"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-all">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-200">
                    {file ? file.name : "Drag & Drop medical file here"}
                  </span>
                  <span className="block text-[9px] text-slate-500 mt-1 uppercase">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports TXT, PDF, DOCX summaries (Max size: 5MB)"}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-950/20 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl flex items-center gap-2 uppercase tracking-wide">
                <AlertTriangle className="w-4.5 h-4.5" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!file || uploadProgress || isLoading}
              className="w-full py-3 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:bg-slate-900 border border-cyan-500/30 disabled:border-white/5 text-cyan-400 disabled:text-slate-650 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98] uppercase tracking-widest shadow-inner"
            >
              {(uploadProgress || isLoading) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              {(uploadProgress || isLoading) ? "INFERRING WORKFLOW AGENTS..." : "TRANSMIT DOCUMENT"}
            </button>

          </form>
        </div>

        {/* OUTCOME PANEL (2 columns) */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-6">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Analysis State Telemetry</span>
          
          {outcome ? (
            <div className="space-y-6 animate-scaleIn">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-full bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                  <CheckCircle2 className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase">Ingestion Successful</h3>
                <span className="text-[9px] text-slate-500 uppercase font-bold">Document entities compiled successfully</span>
              </div>

              <div className="space-y-3 border-t border-white/5 pt-4 text-[10px] font-bold uppercase">
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient Registry ID:</span>
                  <span className="text-slate-200">{outcome.patient_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Risk Stratification:</span>
                  <span className="text-red-400">
                    {outcome.workflow_result?.risk_assessment?.risk_category || "Completed"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Alert Limits Triggered:</span>
                  <span className="text-amber-400">{outcome.workflow_result?.alerts_triggered || 0}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Link 
                  href="/clinical-intelligence" 
                  className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.98] uppercase tracking-wider"
                >
                  Open Digital Twin View <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                
                <Link 
                  href="/monitor" 
                  className="w-full py-2 bg-black/40 hover:bg-black/60 border border-white/5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 text-slate-400 transition-all uppercase tracking-wider"
                >
                  <Cpu className="w-3.5 h-3.5" /> Inspect Agent Traces
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-600 py-16 gap-2">
              <FileCheck className="w-8 h-8 opacity-40" />
              <span className="text-[9px] text-center font-bold uppercase tracking-widest">Logs populate on file ingest.</span>
            </div>
          )}
        </div>

      </div>

      {/* EMBEDDED REPORT OUTCOME */}
      {outcome?.workflow_result?.clinical_report && (
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden flex flex-col">
          <div className="flex border-b border-white/5 bg-black/40 p-2 gap-2">
            <button
              onClick={() => setReportTab("physician")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                reportTab === "physician"
                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300 shadow-sm"
                  : "border-transparent text-slate-500 hover:text-slate-350"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Physician Synthesis
            </button>
            <button
              onClick={() => setReportTab("patient")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                reportTab === "patient"
                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300 shadow-sm"
                  : "border-transparent text-slate-500 hover:text-slate-350"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Layman Translation
            </button>
          </div>

          <div className="p-6">
            {reportTab === "physician" ? (
              <div className="space-y-1">
                {renderMarkdown(outcome.workflow_result.clinical_report.reasoning_report)}
              </div>
            ) : (
              <div className="space-y-1">
                {renderMarkdown(outcome.workflow_result.clinical_report.explanation_report)}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
