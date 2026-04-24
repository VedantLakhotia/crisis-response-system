import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, getDocs, where
} from "firebase/firestore";
import { toast, Toaster } from "sonner";
import {
  ShieldCheck, Plus, Building2, Globe, Activity,
  LogOut, Copy, Check, Eye, EyeOff, Loader2, X, ArrowLeft
} from "lucide-react";

const SUPER_ADMIN_ID = "SUPER-ADMIN-2025";

function generateHotelID(name) {
  const slug = name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 6).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `HOTEL-${slug}-${rand}`;
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function SuperAdminLogin({ onLogin, onBack }) {
  const [id, setId] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!id.trim()) return;
    setLoading(true);
    setTimeout(() => {
      if (id.trim() === SUPER_ADMIN_ID) {
        onLogin();
      } else {
        toast.error("Invalid Admin ID", { description: "Access denied." });
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#08080d] flex items-center justify-center font-sans">
      <Toaster position="top-right" theme="dark" richColors />
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-64 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-[400px] rounded-2xl overflow-hidden animate-scaleIn"
        style={{ background: "linear-gradient(160deg,#111118 0%,#0a0a10 100%)", border: "1px solid rgba(245,158,11,0.2)", boxShadow: "0 0 60px rgba(245,158,11,0.06)" }}>
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <ShieldCheck size={28} className="text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Master Admin Console</h1>
          <p className="text-sm text-slate-600">Enter your Super Admin ID to proceed</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 flex flex-col gap-4">
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">Admin ID</label>
            <input
              type={show ? "text" : "password"}
              value={id}
              onChange={e => setId(e.target.value)}
              placeholder="SUPER-ADMIN-XXXX"
              autoFocus required
              className="w-full px-4 py-3 pr-12 rounded-xl text-sm text-white placeholder-slate-700 focus:outline-none focus:ring-2 transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,158,11,0.2)", focusRingColor: "rgba(245,158,11,0.5)" }}
            />
            <button type="button" onClick={() => setShow(v => !v)}
              className="absolute right-3 top-[38px] text-slate-600 hover:text-slate-400">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button type="submit" disabled={loading || !id.trim()}
            className="w-full py-3 rounded-xl text-white text-sm font-bold tracking-wide transition-all btn-click-effect disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#d97706,#b45309)", boxShadow: "0 4px 20px rgba(217,119,6,0.3)" }}>
            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Access Master Console"}
          </button>

          {/* Back to role selector */}
          {onBack && (
            <button type="button" onClick={onBack}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-600 hover:text-slate-400 transition-colors mt-1">
              <ArrowLeft size={12} /> Back to role selector
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// ── Add Hotel Modal ───────────────────────────────────────────────────────────
function AddHotelModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", location: "", managerName: "", managerEmail: "", plan: "standard" });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleGenerate = () => {
    if (!form.name.trim()) return toast.error("Enter hotel name first");
    setPreview(generateHotelID(form.name));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.location) return toast.error("Fill required fields");
    const hotelID = preview || generateHotelID(form.name);
    setLoading(true);
    await onAdd({ ...form, hotelID });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="w-[520px] rounded-2xl border border-white/10 overflow-hidden animate-scaleIn"
        style={{ background: "linear-gradient(160deg,#14161e 0%,#0d0f15 100%)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <Building2 size={16} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Register New Hotel</h3>
              <p className="text-[11px] text-slate-600">Generate a unique Hotel ID token</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/8"><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hotel / Property Name *</label>
              <input type="text" value={form.name} onChange={e => { set("name", e.target.value); setPreview(null); }}
                placeholder='e.g. "Radisson Blu Indore"' required
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">City / Location *</label>
              <input type="text" value={form.location} onChange={e => set("location", e.target.value)} placeholder="Indore, MP" required
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Plan</label>
              <select value={form.plan} onChange={e => set("plan", e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Manager Name</label>
              <input type="text" value={form.managerName} onChange={e => set("managerName", e.target.value)} placeholder="John Smith"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Manager Email</label>
              <input type="email" value={form.managerEmail} onChange={e => set("managerEmail", e.target.value)} placeholder="manager@hotel.com"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
          </div>

          {/* Hotel ID Generator */}
          <div className="rounded-xl p-4" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Hotel ID Token</span>
              <button type="button" onClick={handleGenerate}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors">
                {preview ? "Regenerate" : "Generate ID"}
              </button>
            </div>
            <p className="text-sm font-mono font-bold text-amber-400">
              {preview || "Click 'Generate ID' to create a unique token"}
            </p>
            {preview && <p className="text-[10px] text-slate-600 mt-1">This ID will be used by the manager to login</p>}
          </div>

          <button type="submit" disabled={loading || !form.name || !form.location}
            className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all btn-click-effect disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#d97706,#b45309)", boxShadow: "0 4px 20px rgba(217,119,6,0.25)" }}>
            {loading ? <Loader2 size={15} className="animate-spin mx-auto" /> : <span className="flex items-center justify-center gap-2"><Plus size={15} /> Register Hotel</span>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Console ──────────────────────────────────────────────────────────────
function SuperAdminDashboard({ onLogout }) {
  const [hotels, setHotels] = useState([]);
  const [globalAlerts, setGlobalAlerts] = useState([]);
  const [showAddHotel, setShowAddHotel] = useState(false);
  const [copied, setCopied] = useState(null);
  const [activeTab, setActiveTab] = useState("hotels");

  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, "hotels"), orderBy("createdAt", "desc")),
      snap => setHotels(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    const unsub2 = onSnapshot(
      query(collection(db, "alerts"), orderBy("time", "desc")),
      snap => setGlobalAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleAddHotel = async (form) => {
    try {
      await addDoc(collection(db, "hotels"), {
        name: form.name,
        location: form.location,
        hotelID: form.hotelID,
        managerName: form.managerName || "",
        managerEmail: form.managerEmail || "",
        plan: form.plan,
        active: true,
        createdAt: serverTimestamp(),
      });
      toast.success(`${form.name} registered!`, { description: `Hotel ID: ${form.hotelID}` });
      setShowAddHotel(false);
    } catch (err) {
      toast.error("Failed to register hotel", { description: err.message });
    }
  };

  const copyID = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
    toast.success("Hotel ID copied!");
  };

  const activeCount = globalAlerts.filter(a => a.status !== "RESOLVED").length;
  const PLAN_STYLES = {
    standard: "text-slate-400 bg-slate-500/10 border-slate-500/20",
    pro: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    enterprise: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div className="min-h-screen bg-[#08080d] text-white font-sans flex overflow-hidden">
      <Toaster position="top-right" theme="dark" richColors />

      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r" style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(245,158,11,0.1)" }}>
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="p-2.5 rounded-xl" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <ShieldCheck size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white">Master Console</h1>
            <p className="text-[10px] text-amber-700 font-black uppercase tracking-wider">Super Admin</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-4 flex-1">
          {[
            { id: "hotels", label: "Hotel Registry", Icon: Building2 },
            { id: "global", label: "Global Alerts", Icon: Globe },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left"
              style={{
                background: activeTab === t.id ? "rgba(245,158,11,0.1)" : "transparent",
                color: activeTab === t.id ? "#fbbf24" : "rgba(100,116,139,0.8)",
                border: activeTab === t.id ? "1px solid rgba(245,158,11,0.2)" : "1px solid transparent",
              }}>
              <t.Icon size={16} /> {t.label}
              {t.id === "global" && activeCount > 0 && (
                <span className="ml-auto text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">{activeCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-4 pb-6 mt-auto">
          <button onClick={onLogout}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all w-full">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-8 py-5 border-b flex justify-between items-center"
          style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(245,158,11,0.08)" }}>
          <div>
            <h2 className="text-lg font-bold text-white">{activeTab === "hotels" ? "Hotel Registry" : "Global Alert Monitor"}</h2>
            <p className="text-[11px] text-slate-600">{activeTab === "hotels" ? `${hotels.length} properties registered` : `${activeCount} active alerts across all properties`}</p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === "hotels" && (
              <button onClick={() => setShowAddHotel(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white btn-click-effect"
                style={{ background: "linear-gradient(135deg,#d97706,#b45309)", boxShadow: "0 4px 20px rgba(217,119,6,0.25)" }}>
                <Plus size={16} /> Add Hotel
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
              style={{ background: "rgba(245,158,11,0.08)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Master Access
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 hide-scrollbar">

          {/* Hotels Tab */}
          {activeTab === "hotels" && (
            <div className="flex flex-col gap-4">
              {hotels.length === 0 ? (
                <div className="text-center py-20 text-slate-700">
                  <Building2 size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="font-bold">No hotels registered yet</p>
                  <p className="text-sm mt-1">Click "Add Hotel" to register your first property</p>
                </div>
              ) : hotels.map(h => (
                <div key={h.id} className="flex items-center justify-between p-5 rounded-2xl transition-all hover:bg-white/[0.02]"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                      <Building2 size={18} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{h.name}</p>
                      <p className="text-xs text-slate-500">{h.location} · {h.managerName || "No manager set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${PLAN_STYLES[h.plan] || PLAN_STYLES.standard}`}>
                      {h.plan}
                    </span>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-all"
                      onClick={() => copyID(h.hotelID)}
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <span className="text-xs font-mono font-bold text-amber-400">{h.hotelID}</span>
                      {copied === h.hotelID ? <Check size={13} className="text-green-400" /> : <Copy size={13} className="text-slate-600" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Global Alerts Tab */}
          {activeTab === "global" && (
            <div className="flex flex-col gap-3">
              {globalAlerts.length === 0 ? (
                <div className="text-center py-20 text-slate-700">
                  <Activity size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="font-bold">No alerts recorded</p>
                </div>
              ) : globalAlerts.slice(0, 50).map(a => {
                const STATUS_C = { RESOLVED: "text-green-400", CONFIRMED: "text-red-400", "EN-ROUTE": "text-blue-400", PENDING_VERIFICATION: "text-yellow-400" };
                const TYPE_C = { FIRE: "🔥", MEDICAL: "🚑", SECURITY: "🛡️", OTHER: "⚠️" };
                return (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-3">
                      <span className="text-base">{TYPE_C[a.type] || "⚠️"}</span>
                      <div>
                        <p className="text-sm font-bold text-white">{a.type} — {a.location || "Unknown"}</p>
                        <p className="text-[10px] text-slate-600 font-mono">{a.hotelID || "No hotel"} · {a.time?.toDate ? a.time.toDate().toLocaleString() : "—"}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${STATUS_C[a.status] || "text-slate-500"}`}>
                      {a.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {showAddHotel && <AddHotelModal onClose={() => setShowAddHotel(false)} onAdd={handleAddHotel} />}
    </div>
  );
}

// ── Root Export ───────────────────────────────────────────────────────────────
export default function SuperAdminConsole({ onBack }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("superAdminAuth") === "true");
  const handleLogin = () => { sessionStorage.setItem("superAdminAuth", "true"); setAuthed(true); };
  const handleLogout = () => {
    sessionStorage.removeItem("superAdminAuth");
    sessionStorage.removeItem("adminConsoleMode");
    if (onBack) {
      onBack();
    } else {
      setAuthed(false);
    }
  };
  return authed ? <SuperAdminDashboard onLogout={handleLogout} /> : <SuperAdminLogin onLogin={handleLogin} onBack={onBack} />;
}
