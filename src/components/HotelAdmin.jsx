import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, where } from "firebase/firestore";
import { ShieldCheck, Users, History, Link2, ArrowLeft, Plus, Building2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useHotel } from "../context/HotelContext";
import { AddStaffModal, StaffDirectory, RoomManagement, AuditLogs } from "./AdminPanels";

export default function HotelAdmin() {
  const { hotelName, hotelID, orgID } = useHotel();
  const [staff, setStaff] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("directory");
  const [staffSearch, setStaffSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const qStaff = query(collection(db, "staff"), where("hotelID", "==", hotelID));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
      setStaff(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
    });
    const qLogs = query(collection(db, "logs"), where("hotelID", "==", hotelID), orderBy("time", "desc"));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setLogs(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
    });
    return () => { unsubStaff(); unsubLogs(); };
  }, [hotelID]);

  const handleAddStaff = async (form) => {
    const exists = staff.find(s => (s.email || "").toLowerCase() === form.email.toLowerCase());
    if (exists) return toast.error("Email already registered");
    try {
      await addDoc(collection(db, "staff"), {
        name: form.name,
        email: form.email,
        role: form.role,
        id: `STF-${Date.now().toString(36).toUpperCase()}`,
        hotelID,
        onDuty: true,
        createdAt: serverTimestamp(),
      });
      toast.success(`${form.name} registered successfully`);
    } catch (err) {
      toast.error("Error adding staff");
    }
  };

  const toggleDuty = async (docId, current) => {
    try {
      await updateDoc(doc(db, "staff", docId), { onDuty: !current });
      toast.success(current ? "Set to Off-Duty" : "Set to On-Duty");
    } catch { toast.error("Error updating status"); }
  };

  const deleteStaff = async (docId, name) => {
    if (!window.confirm(`Remove ${name}?`)) return;
    try {
      await deleteDoc(doc(db, "staff", docId));
      toast.success(`${name} removed`);
    } catch { toast.error("Error removing staff"); }
  };

  const TABS = [
    { id: "directory", label: "Staff Directory", icon: Users },
    { id: "rooms", label: "Room & QR Assets", icon: Link2 },
    { id: "logs", label: "Audit Logs", icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white font-sans flex overflow-hidden">
      <Toaster position="top-right" theme="dark" richColors />

      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 flex flex-col" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="p-2.5 bg-indigo-500/15 rounded-xl border border-indigo-500/20">
            <ShieldCheck size={22} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white">Admin Console</h1>
            <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Management</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-4">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === t.id ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 glow-indigo" : "text-slate-500 hover:bg-white/5 hover:text-slate-300 border border-transparent"
              }`}>
              <t.icon size={17} /> {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto px-4 pb-6">
          <button onClick={() => window.location.href = "/"}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white/5 hover:text-slate-300 transition-all w-full border border-transparent">
            <ArrowLeft size={17} /> Back to Dashboard
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Hotel Identity */}
        <header className="px-8 py-5 border-b border-white/5 flex justify-between items-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/15">
              <Building2 size={20} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">{hotelName}</h2>
              <p className="text-[11px] text-slate-600 font-mono">ORG: {orgID} · ID: {hotelID}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === "directory" && (
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all btn-click-effect"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 4px 20px rgba(99,102,241,0.25)" }}>
                <Plus size={16} /> Add Staff
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider" style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80" }}>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              System Live
            </div>
          </div>
        </header>

        {/* Tab title */}
        <div className="px-8 py-4 border-b border-white/5">
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em]">
            {activeTab === "directory" ? "Staff Directory" : activeTab === "rooms" ? "Room & QR Asset Management" : "Incident Audit Logs"}
          </h3>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scroll">
          <div className="max-w-6xl mx-auto">
            {activeTab === "directory" && (
              <StaffDirectory staff={staff} searchTerm={staffSearch} setSearchTerm={setStaffSearch} onToggleDuty={toggleDuty} onDelete={deleteStaff} />
            )}
            {activeTab === "rooms" && <RoomManagement hotelID={hotelID} />}
            {activeTab === "logs" && <AuditLogs logs={logs} searchTerm={logSearch} setSearchTerm={setLogSearch} />}
          </div>
        </div>
      </main>

      {showAddModal && <AddStaffModal onClose={() => setShowAddModal(false)} onAdd={handleAddStaff} />}
    </div>
  );
}
