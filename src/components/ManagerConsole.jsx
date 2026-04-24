import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp, where
} from "firebase/firestore";
import { toast, Toaster } from "sonner";
import {
  Building2, Users, Radio, LogOut, Plus, X,
  ToggleLeft, ToggleRight, Trash2, Search, Eye, EyeOff,
  Loader2, ArrowLeft, History, CheckCircle
} from "lucide-react";
import CommunicationHub from "./CommunicationHub";

// ── Manager Login ─────────────────────────────────────────────────────────────
function ManagerLogin({ onLogin, onBack }) {
  const [hotelID, setHotelID] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hotelID.trim()) return;
    setLoading(true);
    try {
      // Verify hotel exists in Firestore
      const snap = await import("firebase/firestore").then(({ getDocs, query, collection, where }) =>
        getDocs(query(collection(db, "hotels"), where("hotelID", "==", hotelID.trim().toUpperCase())))
      );
      if (snap.empty) {
        toast.error("Invalid Hotel ID", { description: "No hotel found with this ID." });
      } else {
        const hotel = snap.docs[0].data();
        onLogin({ hotelID: hotel.hotelID, hotelName: hotel.name, location: hotel.location });
      }
    } catch (err) {
      toast.error("Login failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080d] flex items-center justify-center font-sans">
      <Toaster position="top-right" theme="dark" richColors />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-64 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-[400px] rounded-2xl overflow-hidden animate-scaleIn"
        style={{ background: "linear-gradient(160deg,#111118 0%,#0a0a10 100%)", border: "1px solid rgba(99,102,241,0.2)", boxShadow: "0 0 60px rgba(99,102,241,0.06)" }}>
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}>
            <Building2 size={28} className="text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Manager Command Center</h1>
          <p className="text-sm text-slate-600">Enter your Hotel ID to access your property console</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 flex flex-col gap-4">
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">Hotel ID</label>
            <input
              type={show ? "text" : "password"}
              value={hotelID}
              onChange={e => setHotelID(e.target.value)}
              placeholder="HOTEL-XXXXX-XXX"
              autoFocus required
              className="w-full px-4 py-3 pr-12 rounded-xl text-sm text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(99,102,241,0.2)" }}
            />
            <button type="button" onClick={() => setShow(v => !v)}
              className="absolute right-3 top-[38px] text-slate-600 hover:text-slate-400">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-[10px] text-slate-700 -mt-2">Your Hotel ID was provided by the Super Admin</p>

          <button type="submit" disabled={loading || !hotelID.trim()}
            className="w-full py-3 rounded-xl text-white text-sm font-bold tracking-wide transition-all btn-click-effect disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}>
            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Access Command Center"}
          </button>

          {onBack ? (
            <button type="button" onClick={onBack}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-600 hover:text-slate-400 transition-colors mt-1">
              <ArrowLeft size={12} /> Back to role selector
            </button>
          ) : (
            <button type="button" onClick={() => window.location.href = "/"}
              className="flex items-center justify-center gap-2 text-xs text-slate-700 hover:text-slate-400 transition-colors mt-1">
              <ArrowLeft size={12} /> Back to Dashboard
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// ── Add Staff Modal ───────────────────────────────────────────────────────────
function AddStaffModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", email: "", role: "front_desk" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Enter staff name");
    onAdd(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="w-[460px] rounded-2xl border border-white/10 overflow-hidden animate-scaleIn"
        style={{ background: "linear-gradient(160deg,#14161e 0%,#0d0f15 100%)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <Plus size={16} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Add Staff Member</h3>
              <p className="text-[11px] text-slate-600">Register to your property's directory</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/8"><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name *</label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Amit Sharma" required
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email (optional)</label>
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="amit@hotel.com"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
            <select value={form.role} onChange={e => set("role", e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none cursor-pointer"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <option value="front_desk">Front Desk</option>
              <option value="security">Security</option>
              <option value="responder">Emergency Responder</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <button type="submit"
            className="w-full py-3 mt-1 rounded-xl text-white text-sm font-bold transition-all btn-click-effect"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", boxShadow: "0 4px 20px rgba(99,102,241,0.25)" }}>
            <span className="flex items-center justify-center gap-2"><Plus size={15} /> Add Staff</span>
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Staff List ────────────────────────────────────────────────────────────────
function StaffPanel({ staff, onToggleDuty, onDelete }) {
  const [search, setSearch] = useState("");
  const ROLE_STYLES = {
    manager: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    security: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    front_desk: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    responder: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    housekeeping: "bg-green-500/15 text-green-400 border-green-500/20",
  };
  const filtered = staff.filter(s =>
    (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.role || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
          <input type="text" placeholder="Search staff…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
        <span className="text-xs text-slate-600 font-semibold">{filtered.length} personnel</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-700">
          <Users size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold text-sm">No staff yet — add your first member</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(s => (
            <div key={s.docId} className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${s.onDuty ? "" : "opacity-50"}`}
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${s.onDuty ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)"}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <span className="text-sm font-black text-indigo-400">{(s.name || "?")[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{s.name}</p>
                <p className="text-[10px] font-mono text-slate-600">{s.id}</p>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${ROLE_STYLES[s.role] || "bg-slate-500/15 text-slate-400 border-slate-500/20"}`}>
                {(s.role || "staff").replace("_", " ")}
              </span>
              <button onClick={() => onToggleDuty(s.docId, s.onDuty)}
                className={`transition-all hover:scale-110 ${s.onDuty ? "text-green-400" : "text-slate-600"}`}>
                {s.onDuty ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
              <button onClick={() => onDelete(s.docId, s.name)}
                className="p-2 text-slate-700 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-500/10">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Alert Feed ────────────────────────────────────────────────────────────────
function AlertFeed({ alerts }) {
  const TYPE_EMOJI = { FIRE: "🔥", MEDICAL: "🚑", SECURITY: "🛡️", OTHER: "⚠️" };
  const STATUS_C = {
    RESOLVED: "text-green-400 bg-green-500/10 border-green-500/20",
    CONFIRMED: "text-red-400 bg-red-500/10 border-red-500/20",
    "EN-ROUTE": "text-blue-400 bg-blue-500/10 border-blue-500/20",
    PENDING_VERIFICATION: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  };
  if (alerts.length === 0) return (
    <div className="text-center py-16 text-slate-700">
      <CheckCircle size={36} className="mx-auto mb-3 opacity-30" />
      <p className="font-bold text-sm">All clear — no incidents</p>
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      {alerts.slice(0, 30).map(a => (
        <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-lg">{TYPE_EMOJI[a.type] || "⚠️"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">{a.type} — {a.location || "Unknown"}</p>
            <p className="text-[10px] text-slate-600">{a.time?.toDate ? a.time.toDate().toLocaleString() : "—"} · By {a.triggeredBy || "—"}</p>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${STATUS_C[a.status] || "text-slate-400 bg-slate-500/10 border-slate-500/20"}`}>
            {a.status}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function ManagerDashboard({ hotel, onLogout }) {
  const { hotelID, hotelName, location } = hotel;
  const [staff, setStaff] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState("staff");
  const [showAddStaff, setShowAddStaff] = useState(false);

  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, "staff"), where("hotelID", "==", hotelID)),
      snap => setStaff(snap.docs.map(d => ({ docId: d.id, ...d.data() }))),
      () => {}
    );
    const unsub2 = onSnapshot(
      query(collection(db, "alerts"), where("hotelID", "==", hotelID), orderBy("time", "desc")),
      snap => setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return () => { unsub1(); unsub2(); };
  }, [hotelID]);

  const addStaff = async (form) => {
    const staffID = `STF-${Date.now().toString(36).toUpperCase()}`;
    try {
      await addDoc(collection(db, "staff"), {
        name: form.name,
        email: form.email || "",
        role: form.role,
        id: staffID,
        hotelID,
        onDuty: true,
        createdAt: serverTimestamp(),
      });
      toast.success(`${form.name} added`, { description: `Staff ID: ${staffID}` });
    } catch (err) { toast.error("Failed to add staff"); }
  };

  const toggleDuty = async (docId, current) => {
    try {
      await updateDoc(doc(db, "staff", docId), { onDuty: !current });
      toast.success(current ? "Set to Off-Duty" : "Set to On-Duty");
    } catch { toast.error("Update failed"); }
  };

  const deleteStaff = async (docId, name) => {
    if (!window.confirm(`Remove ${name}?`)) return;
    try {
      await deleteDoc(doc(db, "staff", docId));
      toast.success(`${name} removed`);
    } catch { toast.error("Delete failed"); }
  };

  const activeAlerts = alerts.filter(a => a.status !== "RESOLVED").length;

  const TABS = [
    { id: "staff", label: "Staff", Icon: Users },
    { id: "alerts", label: "Alerts", Icon: History, badge: activeAlerts },
    { id: "comms", label: "Comm Hub", Icon: Radio },
  ];

  return (
    <div className="min-h-screen bg-[#08080d] text-white font-sans flex overflow-hidden">
      <Toaster position="top-right" theme="dark" richColors />

      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r"
        style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(99,102,241,0.1)" }}>
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="p-2.5 rounded-xl" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}>
            <Building2 size={20} className="text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm text-white truncate">{hotelName}</h1>
            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wider truncate">{location}</p>
          </div>
        </div>

        <div className="px-4 mb-4">
          <div className="px-4 py-2 rounded-xl text-[10px] font-mono text-slate-600"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            ID: {hotelID}
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-4 flex-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left"
              style={{
                background: activeTab === t.id ? "rgba(99,102,241,0.12)" : "transparent",
                color: activeTab === t.id ? "#818cf8" : "rgba(100,116,139,0.8)",
                border: activeTab === t.id ? "1px solid rgba(99,102,241,0.25)" : "1px solid transparent",
              }}>
              <t.Icon size={16} /> {t.label}
              {t.badge > 0 && (
                <span className="ml-auto text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">{t.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-4 pb-6 mt-auto flex flex-col gap-2">
          <button onClick={() => window.location.href = "/"}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all w-full">
            <ArrowLeft size={15} /> Main Dashboard
          </button>
          <button onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all w-full">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="px-8 py-5 border-b flex justify-between items-center"
          style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(99,102,241,0.08)" }}>
          <div>
            <h2 className="text-lg font-bold text-white">
              {activeTab === "staff" ? "Staff Directory" : activeTab === "alerts" ? "Incident Alerts" : "Communication Hub"}
            </h2>
            <p className="text-[11px] text-slate-600">
              {activeTab === "staff" ? `${staff.length} registered · ${staff.filter(s => s.onDuty).length} on duty`
                : activeTab === "alerts" ? `${activeAlerts} active incidents`
                : "Broadcast & direct messaging"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === "staff" && (
              <button onClick={() => setShowAddStaff(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white btn-click-effect"
                style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}>
                <Plus size={15} /> Add Staff
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
              style={{ background: "rgba(34,197,94,0.08)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.15)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 hide-scrollbar">
          {activeTab === "staff" && <StaffPanel staff={staff} onToggleDuty={toggleDuty} onDelete={deleteStaff} />}
          {activeTab === "alerts" && <AlertFeed alerts={alerts} />}
          {activeTab === "comms" && (
            <div style={{ height: "calc(100vh - 200px)" }}>
              <CommunicationHub hotelID={hotelID} staffList={staff} senderName={`Manager · ${hotelName}`} />
            </div>
          )}
        </div>
      </main>

      {showAddStaff && <AddStaffModal onClose={() => setShowAddStaff(false)} onAdd={addStaff} />}
    </div>
  );
}

// ── Root Export ───────────────────────────────────────────────────────────────
export default function ManagerConsole({ onBack }) {
  const [hotel, setHotel] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("managerSession") || "null"); } catch { return null; }
  });

  const handleLogin = (h) => {
    sessionStorage.setItem("managerSession", JSON.stringify(h));
    setHotel(h);
  };
  const handleLogout = () => {
    sessionStorage.removeItem("managerSession");
    sessionStorage.removeItem("adminConsoleMode");
    if (onBack) {
      onBack();
    } else {
      setHotel(null);
    }
  };

  return hotel ? <ManagerDashboard hotel={hotel} onLogout={handleLogout} /> : <ManagerLogin onLogin={handleLogin} onBack={onBack} />;
}
