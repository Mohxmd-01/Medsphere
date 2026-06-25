"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background,
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
  Stethoscope,
  Search,
  Minimize2,
  Sparkles,
  ShieldAlert,
  BookOpen,
  Orbit
} from "lucide-react";

// --- CUSTOM STAR CONSTELLATION NODE ---
const ConstellationNode = ({ data }: any) => {
  const { label, type } = data;
  
  const getStyles = () => {
    switch (type) {
      case "Patient":
        return {
          glow: "shadow-[0_0_20px_rgba(244,63,94,0.25)] border-pink-300 bg-pink-100/90 text-pink-700",
          icon: <User className="w-4 h-4" />
        };
      case "Disease":
        return {
          glow: "shadow-[0_0_20px_rgba(239,68,68,0.25)] border-red-300 bg-red-50 text-red-600",
          icon: <Heart className="w-4 h-4" />
        };
      case "Medication":
        return {
          glow: "shadow-[0_0_20px_rgba(99,102,241,0.25)] border-indigo-300 bg-indigo-50 text-indigo-600",
          icon: <Pill className="w-4 h-4" />
        };
      case "LabEvent":
      case "LabResult":
        return {
          glow: "shadow-[0_0_20px_rgba(16,185,129,0.25)] border-emerald-300 bg-emerald-50 text-emerald-600",
          icon: <Activity className="w-4 h-4" />
        };
      case "VisitEvent":
      case "Visit":
        return {
          glow: "shadow-[0_0_20px_rgba(168,85,247,0.25)] border-purple-300 bg-purple-50 text-purple-600",
          icon: <Calendar className="w-4 h-4" />
        };
      case "Alert":
        return {
          glow: "shadow-[0_0_20px_rgba(244,63,94,0.35)] border-rose-400 bg-rose-50 text-rose-600 animate-pulse",
          icon: <ShieldAlert className="w-4 h-4" />
        };
      default:
        return {
          glow: "shadow-[0_0_15px_rgba(0,0,0,0.05)] border-slate-300 bg-slate-50 text-slate-600",
          icon: <BookOpen className="w-4 h-4" />
        };
    }
  };

  const style = getStyles();

  return (
    <div className="flex flex-col items-center gap-1 relative group">
      {/* Orbit paths & rings decoration */}
      <div className="absolute w-12 h-12 rounded-full border border-pink-100/50 -top-1 pointer-events-none group-hover:border-pink-300" />
      
      {/* Star Node Circle */}
      <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 hover:scale-110 z-10 ${style.glow}`}>
        {style.icon}
      </div>

      {/* Star Label readout */}
      <div className="absolute top-11 whitespace-nowrap bg-white border border-pink-100 px-2 py-0.5 rounded text-[8px] font-mono-tech text-slate-800 shadow-md transition-all z-20">
        {label}
        <span className="block text-[6px] text-slate-500 uppercase tracking-widest text-center mt-0.5">{type}</span>
      </div>
    </div>
  );
};

export default function GraphPage() {
  const { graphData, selectedPatientId, fetchPatientGraph, patients } = useStore();
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedNodeType, setSelectedNodeType] = useState("All");

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientGraph(selectedPatientId);
      setSelectedNode(null);
    }
  }, [selectedPatientId, fetchPatientGraph]);

  const nodeTypesDict = useMemo(() => ({
    customNode: ConstellationNode
  }), []);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!graphData?.nodes) return [];
    
    return graphData.nodes.filter((node: any) => {
      const label = node.data.label.toLowerCase();
      const type = node.data.type;
      
      const matchesSearch = label.includes(searchFilter.toLowerCase()) || node.id.includes(searchFilter);
      const matchesType = selectedNodeType === "All" || type === selectedNodeType;
      
      return matchesSearch && matchesType;
    }).map((node: any) => ({
      ...node,
      type: "customNode"
    }));
  }, [graphData, searchFilter, selectedNodeType]);

  // Keep edges connecting active nodes
  const filteredEdges = useMemo(() => {
    if (!graphData?.edges) return [];
    const validNodeIds = new Set(filteredNodes.map(n => n.id));
    return graphData.edges
      .filter(edge => validNodeIds.has(edge.source) && validNodeIds.has(edge.target))
      .map(edge => ({
        ...edge,
        animated: edge.label.toLowerCase().includes("precedes") || edge.label.toLowerCase().includes("risk")
      }));
  }, [graphData, filteredNodes]);

  const onNodeClick = (_event: any, node: any) => {
    setSelectedNode(node.data);
  };

  const activePatientName = patients.find(p => p.patient_id === selectedPatientId)?.name || "Patient";

  return (
    <div className="h-[80vh] flex gap-6 relative font-mono-tech select-none animate-fadeIn">
      
      {/* GRAPH CANVAS AREA */}
      <div className="flex-1 glass-panel rounded-2xl border border-white/5 shadow-sm relative overflow-hidden flex flex-col">
        
        {/* GRAPH HEADER CONTROLS */}
        <div className="p-4 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between z-10 bg-slate-950/45 backdrop-blur-md">
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">INTELLIGENCE CONSTELLATION GRAPH</span>
            <span className="text-xs font-bold text-white uppercase">Temporal Path Finder for {activePatientName}</span>
          </div>

          <div className="flex gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input 
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="FIND NODES..."
                className="pl-8 pr-3 py-1.5 border border-white/5 bg-black/40 rounded-lg text-[10px] focus:outline-none focus:border-cyan-500/30 font-mono-tech text-white"
              />
            </div>
            
            {/* Type selector */}
            <select
              value={selectedNodeType}
              onChange={(e) => setSelectedNodeType(e.target.value)}
              className="px-3 py-1.5 border border-white/5 bg-black/40 rounded-lg text-[10px] font-mono-tech font-bold focus:outline-none text-slate-300 focus:border-cyan-500/30"
            >
              <option value="All">ALL CLUSTERS</option>
              <option value="Patient">PATIENTS</option>
              <option value="Disease">DISEASES</option>
              <option value="Medication">MEDICATIONS</option>
              <option value="LabEvent">LAB READINGS</option>
              <option value="Alert">ALERTS</option>
              <option value="Visit">VISITS</option>
            </select>
          </div>
        </div>

        {/* REACT FLOW COMPONENT */}
        <div className="flex-1 w-full h-full relative">
          {filteredNodes.length > 0 ? (
            <ReactFlow
              nodes={filteredNodes as Node[]}
              edges={filteredEdges as Edge[]}
              nodeTypes={nodeTypesDict}
              onNodeClick={onNodeClick}
              fitView
              fitViewOptions={{ padding: 0.3 }}
            >
              <Background color="#0ea5e9" gap={20} size={1} className="opacity-[0.03]" />
              <Controls className="!bg-black/80 !border-white/10 !shadow-2xl text-white" />
              <MiniMap 
                zoomable 
                pannable 
                className="!bg-black/90 !border-white/10 rounded-xl"
                nodeStrokeColor={(n) => {
                  if (n.data?.type === "Patient") return "#06b6d4";
                  if (n.data?.type === "Disease") return "#ef4444";
                  return "#475569";
                }}
              />
            </ReactFlow>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
              No mapped constellation nodes loaded.
            </div>
          )}
        </div>
      </div>

      {/* NODE ATTRIBUTES DETAIL PANEL (Right sidebar) */}
      <div className="w-80 glass-panel rounded-2xl border border-white/5 p-5 shadow-sm flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
        <div className="border-b border-white/5 pb-4">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">KNOWLEDGE SYSTEM INSPECTOR</span>
          <span className="text-[11px] font-bold text-slate-200 block">Metadata Properties</span>
        </div>

        {selectedNode ? (
          <div className="space-y-6">
            {/* Header Node Info */}
            <div className="space-y-1 bg-black/40 p-3.5 rounded-xl border border-white/5">
              <span className="text-[8px] uppercase font-bold text-cyan-400 tracking-widest flex items-center gap-1">
                <Orbit className="w-3.5 h-3.5" />
                {selectedNode.type} Node
              </span>
              <h4 className="text-xs font-bold text-white uppercase leading-normal">{selectedNode.label}</h4>
            </div>

            {/* Properties List */}
            <div className="space-y-4">
              <span className="block text-[8px] uppercase font-bold text-slate-500 tracking-widest">Metadata coordinates</span>
              <div className="space-y-3">
                {Object.entries(selectedNode.properties || {}).map(([key, val]: any) => {
                  if (key === "_id" || key === "hashed_password") return null;
                  return (
                    <div key={key} className="text-[10px] border-b border-white/5 pb-2 last:border-0 font-bold">
                      <span className="block text-[7px] text-slate-500 uppercase tracking-wide">{key.replace("_", " ")}</span>
                      <span className="block text-slate-350 break-all font-mono-tech mt-0.5">{String(val)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-650 gap-2 py-12">
            <Minimize2 className="w-7 h-7 opacity-40 text-slate-500" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Select Star to inspect</span>
          </div>
        )}
      </div>

    </div>
  );
}
