import React, { useState } from "react";
import { Toaster } from "sonner";
import { ShieldCheck, Building2, ArrowLeft } from "lucide-react";
import SuperAdminConsole from "./SuperAdminConsole";
import ManagerConsole from "./ManagerConsole";

// ── Unified Admin Login Gateway ───────────────────────────────────────────────
export default function HotelAdmin() {
  // null = show picker, "admin" = super admin, "manager" = manager
  const [mode, setMode] = useState(() => {
    const saved = sessionStorage.getItem("adminConsoleMode");
    return saved || null;
  });

  const selectMode = (m) => {
    sessionStorage.setItem("adminConsoleMode", m);
    setMode(m);
  };

  const resetMode = () => {
    sessionStorage.removeItem("adminConsoleMode");
    sessionStorage.removeItem("superAdminAuth");
    sessionStorage.removeItem("managerSession");
    setMode(null);
  };

  // If mode selected, render the appropriate console
  if (mode === "admin") return <SuperAdminConsole onBack={resetMode} />;
  if (mode === "manager") return <ManagerConsole onBack={resetMode} />;

  // Role selector screen
  return (
    <div className="min-h-screen bg-[#08080d] flex items-center justify-center font-sans relative overflow-hidden">
      <Toaster position="top-right" theme="dark" richColors />

      {/* Background glows */}
      <div className="absolute top-1/4 left-1/3 w-80 h-60 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-60 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-3xl px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <ShieldCheck size={30} className="text-red-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Admin Console</h1>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Select your access level. Super Admin manages hotel entities globally.
            Manager operates a single property.
          </p>
        </div>

        {/* Two cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Super Admin Card */}
          <button onClick={() => selectMode("admin")}
            className="group text-left p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1"
            style={{
              background: "linear-gradient(160deg, rgba(30,25,15,0.6) 0%, rgba(15,12,8,0.8) 100%)",
              border: "1px solid rgba(245,158,11,0.2)",
              boxShadow: "0 0 0 0 rgba(245,158,11,0)",
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 40px rgba(245,158,11,0.1)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 0 0 rgba(245,158,11,0)"}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <ShieldCheck size={22} className="text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Super Admin</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Create hotel entities, generate Hotel ID tokens, and monitor all active crises across properties.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-500 group-hover:text-amber-400 transition-colors">
              Enter with Admin ID →
            </div>
          </button>

          {/* Manager Card */}
          <button onClick={() => selectMode("manager")}
            className="group text-left p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1"
            style={{
              background: "linear-gradient(160deg, rgba(15,15,30,0.6) 0%, rgba(8,8,18,0.8) 100%)",
              border: "1px solid rgba(99,102,241,0.2)",
              boxShadow: "0 0 0 0 rgba(99,102,241,0)",
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 40px rgba(99,102,241,0.1)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 0 0 rgba(99,102,241,0)"}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <Building2 size={22} className="text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Hotel Manager</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Manage your property's staff, view localized alerts, and broadcast via the Communication Hub.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
              Enter with Hotel ID →
            </div>
          </button>
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <button onClick={() => window.location.href = "/"}
            className="inline-flex items-center gap-2 text-xs text-slate-700 hover:text-slate-400 transition-colors">
            <ArrowLeft size={12} /> Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
