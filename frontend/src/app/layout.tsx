"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { 
  LayoutDashboard, 
  Users, 
  Network, 
  Activity, 
  Cpu, 
  UploadCloud, 
  BookOpen, 
  Settings as SettingsIcon,
  LogOut,
  Moon,
  Sun,
  Lock,
  ChevronDown,
  Sparkles,
  Shield,
  Clock
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { 
    isAuthenticated, 
    user, 
    login, 
    logout, 
    patients, 
    fetchPatients, 
    selectedPatientId, 
    setSelectedPatientId 
  } = useStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Set isMounted to true on client mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load patients once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchPatients();
    }
  }, [isAuthenticated, fetchPatients]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const success = await login(username, password);
    if (!success) {
      setLoginError("Access Refused. Use: doctor / password123");
    } else {
      router.push("/dashboard");
    }
  };

  const handleLogoutClick = () => {
    logout();
    router.push("/");
  };

  // Nav items configuration for left micro-dock
  const navItems = [
    { name: "Command Center", href: "/dashboard", icon: LayoutDashboard },
    { name: "Clinical Intel", href: "/clinical-intelligence", icon: Sparkles },
    { name: "Digital Twin Workspace", href: "/patients", icon: Users },
    { name: "Ingestion Hub", href: "/upload", icon: UploadCloud },
  ];

  const activePatient = patients.find(p => p.patient_id === selectedPatientId);

  return (
    <html lang="en" className="light">
      <body className="bg-[#fbfaf7] text-[#0f172a] min-h-screen flex relative overflow-x-hidden font-sans">
        <AppContent
          isMounted={isMounted}
          isAuthenticated={isAuthenticated}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          loginError={loginError}
          handleLoginSubmit={handleLoginSubmit}
          navItems={navItems}
          pathname={pathname}
          activePatient={activePatient}
          isPatientDropdownOpen={isPatientDropdownOpen}
          setIsPatientDropdownOpen={setIsPatientDropdownOpen}
          patients={patients}
          setSelectedPatientId={setSelectedPatientId}
          selectedPatientId={selectedPatientId}
          handleLogoutClick={handleLogoutClick}
          user={user}
          children={children}
        />
      </body>
    </html>
  );
}

function AppContent({
  isMounted,
  isAuthenticated,
  username,
  setUsername,
  password,
  setPassword,
  loginError,
  handleLoginSubmit,
  navItems,
  pathname,
  activePatient,
  isPatientDropdownOpen,
  setIsPatientDropdownOpen,
  patients,
  setSelectedPatientId,
  selectedPatientId,
  handleLogoutClick,
  user,
  children
}: any) {
  // Live Sanctuary Telemetry States
  const [occupancy, setOccupancy] = useState(84.2);
  const [workflows, setWorkflows] = useState(14281);
  const [mdsActive, setMdsActive] = useState(28);

  useEffect(() => {
    if (isAuthenticated || !isMounted) return;
    const interval = setInterval(() => {
      // Vary occupancy slightly
      setOccupancy(prev => {
        const delta = (Math.random() - 0.5) * 0.2;
        const next = prev + delta;
        return parseFloat(Math.min(Math.max(next, 83.5), 85.5).toFixed(1));
      });
      // Increment workflows
      setWorkflows(prev => prev + Math.floor(Math.random() * 2) + 1);
      // Vary active MDs slightly
      setMdsActive(prev => {
        const roll = Math.random();
        if (roll > 0.85) return Math.min(prev + 1, 35);
        if (roll < 0.15) return Math.max(prev - 1, 24);
        return prev;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isMounted]);

  if (!isMounted) {
    return (
      /* Neutral Loading Shell during hydration */
      <div className="flex flex-col items-center justify-center min-h-screen w-full gap-4 bg-dot-grid">
        <div className="w-14 h-14 rounded-xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-pulse">
          <Network className="w-7 h-7 text-cyan-400" />
        </div>
        <p className="text-xs text-slate-450 font-mono-tech tracking-widest uppercase">Initializing MedSphere AI Workspace...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      /* Unauthenticated Login Screen: styled like a luxury medical hospitality greeting console */
      <div className="min-h-screen w-full flex flex-col lg:flex-row relative overflow-hidden bg-[#faf9f6]">
        {/* Soft elegant radial glows on the right side panel */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-500/5 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[40%] w-[500px] h-[500px] bg-rose-500/5 rounded-full filter blur-[120px] pointer-events-none" />

        {/* LEFT COLUMN: Luxurious Sanctuary Welcome & Telemetry */}
        <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-16 overflow-hidden text-white">
          {/* Background image */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] ease-out scale-105"
            style={{ 
              backgroundImage: "url('/wellness_lobby.png')",
              filter: "brightness(0.6) contrast(1.1)"
            }}
          />
          {/* Glassy overlay shading */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-900/75 to-slate-950/95 z-0" />

          {/* Top Panel: Luxury Brand Tag */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
              <Network className="w-5 h-5 text-pink-200 animate-pulse" />
            </div>
            <div>
              <span 
                className="block text-xs font-bold tracking-[0.2em] uppercase font-sans text-white"
                style={{ textShadow: "0 0 12px rgba(255, 255, 255, 0.6), 0 0 4px rgba(255, 255, 255, 0.3)" }}
              >
                MEDSPHERE AI
              </span>
              <span 
                className="block text-[8px] font-sans text-pink-100/90 tracking-widest uppercase font-medium"
                style={{ textShadow: "0 0 8px rgba(244, 63, 94, 0.4)" }}
              >
                Clinical Sanctuary Platform
              </span>
            </div>
          </div>

          {/* Middle Panel: Majestic Serif Greeting */}
          <div className="relative z-10 max-w-xl my-auto space-y-4">
            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[9px] font-sans text-pink-100 uppercase tracking-widest font-bold"
              style={{ textShadow: "0 0 8px rgba(244, 63, 94, 0.3)" }}
            >
              <Sparkles className="w-2.5 h-2.5 text-pink-200 animate-pulse" /> Care Intelligence Sanctuary
            </span>
            <h2 className="text-4xl lg:text-5xl font-normal tracking-wide text-white font-serif leading-tight">
              <span style={{ textShadow: "0 0 15px rgba(255, 255, 255, 0.5), 0 0 4px rgba(255, 255, 255, 0.2)" }}>
                A serene harbor for
              </span>
              <br />
              <span 
                className="text-transparent bg-clip-text bg-gradient-to-r from-pink-100 via-rose-100 to-amber-100 font-sans font-bold"
                style={{ filter: "drop-shadow(0 0 12px rgba(244, 63, 94, 0.5))" }}
              >
                Clinical Precision.
              </span>
            </h2>
            <p 
              className="text-white/95 text-sm font-light leading-relaxed max-w-md"
              style={{ textShadow: "0 0 10px rgba(255, 255, 255, 0.2)" }}
            >
              Step into a digital twin environment where temporal analysis meets guideline compliance. Harmonizing real-time telemetry with clinical expertise.
            </p>
          </div>

          {/* Bottom Panel: Live Sanctuary Telemetry */}
          <div className="relative z-10 bg-slate-950/60 backdrop-blur-lg border border-white/15 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/15 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                <span 
                  className="text-[10px] font-sans font-bold uppercase tracking-widest text-white"
                  style={{ textShadow: "0 0 10px rgba(255, 255, 255, 0.3)" }}
                >
                  Sanctuary Live Telemetry
                </span>
              </div>
              <span 
                className="text-[9px] font-sans text-white/90 uppercase tracking-widest font-mono"
                style={{ textShadow: "0 0 8px rgba(255, 255, 255, 0.3)" }}
              >
                TICKER CLK: ON
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1">
                <span 
                  className="block text-[8px] font-sans uppercase tracking-wider text-white/90 font-bold"
                  style={{ textShadow: "0 0 6px rgba(255, 255, 255, 0.2)" }}
                >
                  Resort Occupancy
                </span>
                <span 
                  className="block text-xl font-bold tracking-tight text-white font-mono-tech transition-all duration-500"
                  style={{ textShadow: "0 0 12px rgba(255, 255, 255, 0.5), 0 0 4px rgba(255, 255, 255, 0.2)" }}
                >
                  {occupancy}%
                </span>
              </div>
              <div className="space-y-1">
                <span 
                  className="block text-[8px] font-sans uppercase tracking-wider text-white/90 font-bold"
                  style={{ textShadow: "0 0 6px rgba(255, 255, 255, 0.2)" }}
                >
                  Processed Workflows
                </span>
                <span 
                  className="block text-xl font-bold tracking-tight text-white font-mono-tech transition-all duration-500"
                  style={{ textShadow: "0 0 12px rgba(255, 255, 255, 0.5), 0 0 4px rgba(255, 255, 255, 0.2)" }}
                >
                  {workflows.toLocaleString()}
                </span>
              </div>
              <div className="space-y-1">
                <span 
                  className="block text-[8px] font-sans uppercase tracking-wider text-white/90 font-bold"
                  style={{ textShadow: "0 0 6px rgba(255, 255, 255, 0.2)" }}
                >
                  Active Clinicians
                </span>
                <span 
                  className="block text-xl font-bold tracking-tight text-white font-mono-tech transition-all duration-500"
                  style={{ textShadow: "0 0 12px rgba(255, 255, 255, 0.5), 0 0 4px rgba(255, 255, 255, 0.2)" }}
                >
                  {mdsActive} MDs
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 text-[9px] text-white/80 font-mono-tech border-t border-white/5">
              <span>INTELLIGENCE CORE: 9/9 ONLINE</span>
              <span>RESPONSE LATENCY: 45ms</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Clean, Alabaster Login Panel */}
        <div className="w-full lg:w-[45%] flex items-center justify-center p-6 lg:p-16 relative z-10">
          <div className="w-full max-w-md p-10 rounded-3xl bg-white/80 backdrop-blur-xl border border-white shadow-[0_25px_60px_rgba(244,63,94,0.04)] text-center flex flex-col gap-8 animate-scaleIn">
            
            {/* Responsive Brand Header (visible on mobile where left column is hidden) */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/5 border border-pink-100 flex items-center justify-center shadow-md lg:hidden">
                <Network className="w-6 h-6 text-pink-600 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-[0.15em] text-slate-800 uppercase font-sans">MEDSPHERE AI</h1>
                <p className="text-[10px] text-pink-600 font-sans mt-1 tracking-widest uppercase font-bold">Clinical Care Console</p>
              </div>
              <p className="text-[11px] text-slate-500 font-sans leading-relaxed max-w-[280px]">
                Please authenticate your physician signature or administrative credentials to enter the intelligence suite.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-5 text-left">
              <div className="space-y-1.5">
                <label className="block text-[8px] font-sans text-pink-600 uppercase tracking-widest font-bold">User Signature ID</label>
                <div className="relative flex items-center">
                  <Users className="absolute left-4 w-4 h-4 text-pink-550/70" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="doctor" 
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-pink-100 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200/40 transition-all font-sans text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[8px] font-sans text-pink-600 uppercase tracking-widest font-bold">Access Signature Code</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 w-4 h-4 text-pink-550/70" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-pink-100 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200/40 transition-all font-sans text-xs font-semibold"
                  />
                </div>
              </div>

              {loginError && (
                <div className="text-rose-500 text-[9px] font-sans font-bold border border-rose-200 bg-rose-50/50 py-2.5 px-3 rounded-xl text-center tracking-wide uppercase">
                  {loginError}
                </div>
              )}

              <button 
                type="submit" 
                className="w-full py-3.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-sans font-bold tracking-widest active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/10 hover:shadow-pink-500/20"
              >
                <Shield className="w-4 h-4" />
                VERIFY SIGNATURE
              </button>
            </form>

            <div className="border-t border-pink-100/50 pt-5 flex flex-col gap-2 items-center">
              <span className="text-[8px] font-sans text-slate-400 uppercase tracking-wider font-bold">
                Signature Verification Options:
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                <button 
                  type="button"
                  onClick={() => { setUsername("doctor"); setPassword("password123"); }}
                  className="text-[9px] font-sans text-pink-600 hover:text-pink-700 uppercase tracking-wider font-bold bg-pink-550/5 hover:bg-pink-100 px-3 py-1 rounded-lg border border-pink-200/30 transition-all"
                >
                  Doctor Access
                </button>
                <button 
                  type="button"
                  onClick={() => { setUsername("admin"); setPassword("admin123"); }}
                  className="text-[9px] font-sans text-pink-600 hover:text-pink-700 uppercase tracking-wider font-bold bg-pink-550/5 hover:bg-pink-100 px-3 py-1 rounded-lg border border-pink-200/30 transition-all"
                >
                  Admin Access
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="authenticated-layout flex w-full h-screen overflow-hidden relative">
      {/* Futuristic Radial Grids */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pink-500/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-rose-500/5 rounded-full filter blur-[120px] pointer-events-none" />

      {/* 1. SLEEK MICRO-DOCK (UTILITY BELT SIDEBAR) - w-20 */}
      <aside className="w-20 border-r border-pink-100 bg-white/95 backdrop-blur-xl flex flex-col items-center py-6 shrink-0 relative z-30 justify-between">
        <div className="flex flex-col items-center gap-8 w-full">
          {/* Logo Node */}
          <Link href="/dashboard" className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.1)] group">
            <Network className="w-5 h-5 text-pink-600 group-hover:scale-110 transition-transform duration-300" />
          </Link>

          {/* Menu Items */}
          <nav className="flex flex-col items-center gap-4 w-full">
            {navItems.map((item: any) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  title={item.name}
                  className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all group ${
                    isActive 
                      ? "bg-pink-500/10 border border-pink-300 text-pink-600 shadow-[0_0_15px_rgba(244,63,94,0.15)]" 
                      : "text-slate-400 hover:text-pink-600 hover:bg-pink-50/60 border border-transparent hover:border-pink-200/50"
                  }`}
                >
                  {/* Active state neon indicator strip */}
                  {isActive && (
                    <span className="absolute left-0 w-[3px] h-6 bg-pink-500 rounded-r-md" />
                  )}
                  <Icon className="w-5 h-5" />
                  
                  {/* Floating glass tooltip */}
                  <span className="absolute left-16 px-2.5 py-1 rounded bg-white border border-pink-100 text-slate-800 text-[10px] uppercase font-mono-tech tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-md">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-4 w-full">
          <button 
            onClick={handleLogoutClick}
            title="Logout Signature"
            className="w-12 h-12 rounded-xl flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200/50 transition-all group"
          >
            <LogOut className="w-5 h-5" />
            <span className="absolute left-16 px-2.5 py-1 rounded bg-white border border-pink-100 text-slate-800 text-[10px] uppercase font-mono-tech tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-md">
              Disconnect
            </span>
          </button>
        </div>
      </aside>

      {/* CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* HEADER TOP BAR */}
        <header className="h-16 px-8 border-b border-pink-100 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
          
          {/* PATIENT SELECTOR DROPDOWN */}
          <div className="relative">
            <button 
              onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
              className="flex items-center gap-3 px-4 py-2 border border-pink-100 rounded-xl bg-pink-50/50 text-xs font-mono-tech text-slate-700 hover:bg-pink-100/50 hover:border-pink-300 transition-all shadow-sm"
            >
              <div className={`w-2 h-2 rounded-full ${
                activePatient?.risk_category === "High" 
                  ? "bg-red-500 shadow-[0_0_8px_#ef4444]" 
                  : activePatient?.risk_category === "Moderate" 
                    ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" 
                    : "bg-emerald-500 shadow-[0_0_8px_#10b981]"
              }`} />
              <span>CASE INDEX: <b className="text-pink-700 font-bold">{activePatient?.name || "Select Case"}</b> ({activePatient?.patient_id || "PX000"})</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {isPatientDropdownOpen && (
              <div className="absolute top-12 left-0 w-80 max-h-96 overflow-y-auto bg-white/95 border border-pink-100 rounded-xl shadow-xl z-50 p-2 space-y-1 backdrop-blur-md">
                <div className="px-3 py-1.5 text-[9px] uppercase font-mono-tech text-pink-600/80 tracking-widest border-b border-pink-50 mb-1 font-bold">Select Case Register</div>
                {patients.map((p: any) => (
                  <button
                    key={p.patient_id}
                    onClick={() => {
                      setSelectedPatientId(p.patient_id);
                      setIsPatientDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono-tech flex items-center justify-between transition-all ${
                      p.patient_id === selectedPatientId
                        ? "bg-pink-50 text-pink-700 border border-pink-200/50 font-bold"
                        : "text-slate-600 hover:bg-pink-50/50 hover:text-pink-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        p.risk_category === "High" ? "bg-red-500" : p.risk_category === "Moderate" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      <span>{p.name} ({p.patient_id})</span>
                    </div>
                    <span className="text-[9px] opacity-60">AGE {p.age}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PLATIENT TELEMETRY SYSTEM TIME & METADATA */}
          <div className="flex items-center gap-6">
            {/* Telemetry Clock */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-pink-100/50 rounded-xl bg-pink-50/30 text-[10px] font-mono-tech text-slate-600">
              <Clock className="w-3.5 h-3.5 text-pink-500/70 animate-pulse" />
              <span>SYSTEM STATUS: ONLINE</span>
            </div>

            {/* Physician context profile */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="block text-xs font-bold text-slate-800 uppercase tracking-wide">{user?.full_name || "Guest MD"}</span>
                <span className="block text-[9px] text-pink-600 font-mono-tech uppercase tracking-wider">{user?.role || "Staff Operator"}</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center text-xs font-bold text-pink-700 shadow-[0_0_15px_rgba(244,63,94,0.05)]">
                {user?.full_name?.split(" ").pop()?.charAt(0) || "D"}
              </div>
            </div>
          </div>
        </header>

        {/* MAIN PAGE BODY */}
        <main className="flex-1 p-6 overflow-y-auto relative bg-transparent">
          {children}
        </main>

      </div>
    </div>
  );
}
