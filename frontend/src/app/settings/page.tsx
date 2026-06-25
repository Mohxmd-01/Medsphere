"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { 
  Settings as SettingsIcon, 
  Database, 
  Cpu, 
  Key, 
  CheckCircle2, 
  AlertTriangle,
  Server
} from "lucide-react";
import axios from "axios";

export default function SettingsPage() {
  const { user } = useStore();
  const [dbStatus, setDbStatus] = useState<any>(null);
  useEffect(() => {
    // Fetch API status to read database mock statuses
    const rootUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "");
    axios.get(rootUrl).then((res) => {
      setDbStatus(res.data);
    }).catch(() => {
      setDbStatus({
        status: "offline",
        mongodb_mock: true,
        neo4j_mock: true,
        qdrant_mock: true
      });
    });
  }, []);

  const getStatusBadge = (isMock: boolean) => {
    if (isMock) {
      return (
        <span className="text-[9px] font-bold text-amber-400 bg-amber-955/20 border border-amber-500/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 uppercase">
          <AlertTriangle className="w-3 h-3" /> MOCK (IN-MEMORY)
        </span>
      );
    }
    return (
      <span className="text-[9px] font-bold text-cyan-400 bg-cyan-955/20 border border-cyan-500/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 uppercase">
        <CheckCircle2 className="w-3 h-3" /> ACTIVE (LIVE DOCKER)
      </span>
    );
  };

  return (
    <div className="space-y-6 font-mono-tech select-none animate-fadeIn">
      {/* Header welcome */}
      <div className="pb-4 border-b border-white/5">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">SYSTEM PROPERTIES</span>
        <h1 className="text-xl font-bold tracking-tight text-white uppercase">System Configuration</h1>
        <p className="text-[10px] text-slate-400 mt-1 uppercase">
          Monitor database cluster connectors, API integrations, and developer environments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* DATABASE STATUS PANELS */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-6">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1.5">
            <Database className="w-4 h-4 text-cyan-455" /> Database Cluster Connectors
          </span>

          <div className="space-y-4">
            
            {/* MongoDB */}
            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5">
              <div className="space-y-1">
                <span className="block text-xs font-bold text-slate-200">MongoDB Connector</span>
                <span className="block text-[8px] text-slate-500 uppercase font-bold">Primary operational collections store</span>
              </div>
              <div>{getStatusBadge(dbStatus?.mongodb_mock ?? true)}</div>
            </div>

            {/* Neo4j */}
            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5">
              <div className="space-y-1">
                <span className="block text-xs font-bold text-slate-200">Neo4j Connector</span>
                <span className="block text-[8px] text-slate-500 uppercase font-bold">Temporal clinical knowledge graph</span>
              </div>
              <div>{getStatusBadge(dbStatus?.neo4j_mock ?? true)}</div>
            </div>

            {/* Qdrant */}
            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5">
              <div className="space-y-1">
                <span className="block text-xs font-bold text-slate-200">Qdrant Vector DB</span>
                <span className="block text-[8px] text-slate-500 uppercase font-bold">Guidelines & discharge summaries embeddings</span>
              </div>
              <div>{getStatusBadge(dbStatus?.qdrant_mock ?? true)}</div>
            </div>

            {/* FastAPI Backend */}
            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5">
              <div className="space-y-1">
                <span className="block text-xs font-bold text-slate-200">FastAPI Backend Server</span>
                <span className="block text-[8px] text-slate-500 uppercase font-bold">REST API Gateway & LangGraph controller</span>
              </div>
              <div>{getStatusBadge(dbStatus?.status === "offline")}</div>
            </div>

            {/* XGBoost model */}
            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="block text-xs font-bold text-slate-200">XGBoost Risk Classifier Model</span>
                </div>
                <span className="block text-[8px] text-slate-500 uppercase font-bold">Complication prediction model on disk</span>
              </div>
              <div>{getStatusBadge(false)}</div>
            </div>

            {/* NLP engine */}
            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5">
              <div className="space-y-1">
                <span className="block text-xs font-bold text-slate-200">Clinical NLP Parser Engine</span>
                <span className="block text-[8px] text-slate-500 uppercase font-bold">Observation extraction LLM with spaCy fallback</span>
              </div>
              <div>{getStatusBadge(false)}</div>
            </div>

          </div>
        </div>

        {/* AI & SERVICE CREDENTIALS */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-6">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-455" /> LLM Reasoning Configuration
          </span>

          <div className="space-y-4">
            
            {/* Model Name */}
            <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 space-y-2">
              <span className="text-[8px] text-slate-500 uppercase block font-bold">Primary Reasoning Model</span>
              <div className="flex gap-2 text-[9px] font-bold">
                <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg">gpt-4o-mini</span>
                <span className="px-3 py-1 bg-slate-900 text-slate-500 rounded-lg">gpt-4o</span>
              </div>
            </div>

            {/* Base Endpoint */}
            <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 space-y-1">
              <span className="text-[8px] text-slate-500 uppercase block font-bold">API Gateway Base URL</span>
              <span className="text-xs font-bold font-mono text-slate-200">https://openrouter.ai/api/v1</span>
            </div>

            {/* JWT secret readout (securely masked) */}
            <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 space-y-1 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[8px] text-slate-500 uppercase block font-bold">JWT Secret Signing Token</span>
                <span className="text-xs font-bold font-mono text-slate-300">••••••••••••••••••••••••••••</span>
              </div>
              <Key className="w-4 h-4 text-slate-500" />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
