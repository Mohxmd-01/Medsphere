"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  FileCheck,
  TrendingUp,
  Loader2
} from "lucide-react";

export default function GuidelinesPage() {
  const { 
    guidelines, 
    fetchGuidelines, 
    guidelineResults, 
    searchGuidelines, 
    isLoading 
  } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeGuideIndex, setActiveGuideIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchGuidelines();
  }, [fetchGuidelines]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchGuidelines(searchQuery);
    }
  };

  const activeDoc = activeGuideIndex !== null ? guidelines[activeGuideIndex] : null;

  return (
    <div className="space-y-6 font-mono-tech select-none animate-fadeIn">
      {/* Header welcome */}
      <div className="pb-4 border-b border-white/5">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">SEMANTIC KNOWLEDGE BASE</span>
        <h1 className="text-xl font-bold tracking-tight text-white uppercase">Guidelines Explorer</h1>
        <p className="text-[10px] text-slate-400 mt-1 uppercase">
          Perform semantic searches across international clinical guidelines (WHO, ADA, NICE) vector indexed in Qdrant.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* LEFT PANEL: SEMANTIC SEARCH (3 columns) */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          
          {/* SEARCH BOX */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-4 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Semantic KG-RAG Query Console
            </span>
            
            <form onSubmit={handleSearchSubmit} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Target HbA1c for adult diabetes..."
                  className="w-full pl-9 pr-3 py-2.5 border border-white/5 bg-black/40 rounded-xl text-[10px] focus:outline-none focus:border-cyan-500/30 font-mono-tech text-white"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:bg-slate-900 border border-cyan-500/30 disabled:border-white/5 text-cyan-400 disabled:text-slate-650 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 uppercase tracking-widest shadow-inner"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                QUERY
              </button>
            </form>

            {/* CLINICAL QUERY SUGGESTIONS */}
            <div className="mt-4 flex flex-wrap gap-2 items-center text-[9px] font-bold">
              <span className="text-slate-500 uppercase">SUGGESTIONS:</span>
              {[
                "HbA1c target for adults",
                "Metformin therapy guidelines",
                "Lisinopril BP targets",
                "CAD cardiac risk factors"
              ].map((sugg) => (
                <button
                  key={sugg}
                  type="button"
                  onClick={() => {
                    setSearchQuery(sugg);
                    searchGuidelines(sugg);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200 hover:border-cyan-500/20 transition-all"
                >
                  {sugg}
                </button>
              ))}
            </div>
          </div>

          {/* SEARCH RESULTS CHUNKS */}
          <div className="space-y-4">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Cosine Embedding Matches</span>
            
            {guidelineResults.length > 0 ? (
              <div className="space-y-3">
                {guidelineResults.map((chunk, idx) => (
                  <div key={idx} className="glass-panel p-4 rounded-xl border border-white/5 space-y-3 animate-scaleIn">
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-slate-400 bg-slate-900 border border-white/10 px-2 py-0.5 rounded">
                        Source: {chunk.filename}
                      </span>
                      <span className="text-emerald-450 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" /> Cosine Similarity: {(chunk.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-300 font-semibold">
                      {chunk.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-white/10 bg-black/20 text-slate-500 text-xs">
                Query the guidelines above to view retrieved text RAG evidence.
              </div>
            )}
          </div>

        </div>

        {/* RIGHT PANEL: FULL REPOSITORY (2 columns) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl border border-white/5 p-5 shadow-sm flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
          <div className="border-b border-white/5 pb-3 flex items-center gap-2">
            <BookOpen className="w-4.5 h-4.5 text-cyan-400" />
            <h2 className="text-xs font-bold text-white uppercase">Guidelines Repository</h2>
          </div>

          {/* Files Selector */}
          <div className="flex flex-wrap gap-2">
            {guidelines.map((doc, idx) => (
              <button
                key={doc.doc_id}
                onClick={() => setActiveGuideIndex(idx)}
                className={`px-3 py-2 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                  activeGuideIndex === idx
                    ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
                    : "bg-black/20 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                {doc.filename.replace("_guideline.txt", "").toUpperCase()}
              </button>
            ))}
          </div>

          {/* Content Document Display */}
          <div className="flex-1 overflow-y-auto min-h-[200px]">
            {activeDoc ? (
              <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-4">
                <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest block">Document: {activeDoc.filename}</span>
                <p className="text-[11px] leading-relaxed text-slate-350 font-semibold whitespace-pre-wrap">
                  {activeDoc.content}
                </p>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-600 text-xs">
                Select a guideline document above to read its complete content.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
