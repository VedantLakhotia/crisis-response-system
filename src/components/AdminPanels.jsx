import React, { useState } from "react";
import { Users, Plus, X, Copy, Check, Search, Link2, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

// ============ ADD STAFF MODAL ============
export function AddStaffModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", email: "", role: "manager" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return toast.error("Fill all fields");
    onAdd(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="w-[480px] rounded-2xl border border-white/10 overflow-hidden animate-scaleIn" style={{ background: "linear-gradient(160deg, #14161e 0%, #0d0f15 100%)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/15 rounded-xl border border-indigo-500/20"><Plus size={18} className="text-indigo-400" /></div>
            <div>
              <h3 className="text-sm font-bold text-white">Register Staff Member</h3>
              <p className="text-[11px] text-slate-500">Add to hotel personnel directory</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/8 transition-colors"><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder='e.g. "Amit Sharma"' required
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email ID</label>
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="amit@radissonblu.com" required
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
            <select value={form.role} onChange={e => set("role", e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all cursor-pointer" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <option value="manager">Manager</option>
              <option value="security">Security</option>
              <option value="front_desk">Front Desk</option>
              <option value="responder">Responder</option>
            </select>
          </div>
          <button type="submit" className="w-full py-3 mt-2 rounded-xl text-white text-sm font-bold tracking-wide transition-all btn-click-effect" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}>
            <span className="flex items-center justify-center gap-2"><Plus size={15} /> Register Staff</span>
          </button>
        </form>
      </div>
    </div>
  );
}

// ============ STAFF DIRECTORY TABLE ============
export function StaffDirectory({ staff, searchTerm, setSearchTerm, onToggleDuty, onDelete }) {
  const ROLE_STYLES = {
    manager: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    security: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    front_desk: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    responder: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    staff: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    admin: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  };

  const filtered = staff.filter(s =>
    (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.role || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="relative w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
          <input type="text" placeholder="Search staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
        <span className="text-xs text-slate-600 font-semibold">{filtered.length} personnel</span>
      </div>

      <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-600 border-b border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
              <th className="px-6 py-4">Staff Name</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Staff ID (Login)</th>
              <th className="px-6 py-4">Email Address</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-600">
                <Users size={36} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold text-sm">No staff found</p>
              </td></tr>
            ) : filtered.map(s => (
              <tr key={s.docId} className={`transition-all duration-300 hover:bg-white/[0.03] ${s.onDuty ? "glow-green animate-glow-pulse" : "staff-off-duty"}`}>
                <td className="px-6 py-4 font-bold text-white text-sm">{s.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${ROLE_STYLES[s.role] || ROLE_STYLES.staff}`}>
                    {(s.role || "staff").replace("_", " ")}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-mono text-indigo-400 font-bold tracking-wider">{s.id}</td>
                <td className="px-6 py-4 text-sm text-slate-400 font-mono">{s.email || "—"}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col items-center gap-1">
                    <button onClick={() => onToggleDuty(s.docId, s.onDuty)} className={`transition-all hover:scale-110 cursor-pointer ${s.onDuty ? "text-green-400" : "text-slate-600"}`}>
                      {s.onDuty ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
                    </button>
                    <span className={`text-[9px] font-black uppercase ${s.onDuty ? "text-green-400" : "text-slate-600"}`}>
                      {s.onDuty ? "On-Duty" : "Off-Duty"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => onDelete(s.docId, s.name)} className="p-2 text-slate-700 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-500/10"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ ROOM & QR MANAGEMENT ============
export function RoomManagement({ hotelID }) {
  const [startRoom, setStartRoom] = useState("");
  const [endRoom, setEndRoom] = useState("");
  const [rooms, setRooms] = useState([]);
  const [copied, setCopied] = useState(null);

  const generateRooms = () => {
    const s = parseInt(startRoom), e = parseInt(endRoom);
    if (isNaN(s) || isNaN(e) || s > e || e - s > 999) return toast.error("Invalid range (max 1000 rooms)");
    const arr = [];
    for (let i = s; i <= e; i++) arr.push(i);
    setRooms(arr);
    toast.success(`Generated ${arr.length} rooms`);
  };

  const getLink = (room) => `crisis-response.com/guest?hotelID=${hotelID}&room=${room}`;

  const copyLink = (room) => {
    navigator.clipboard.writeText(getLink(room));
    setCopied(room);
    setTimeout(() => setCopied(null), 1500);
    toast.success(`Link copied for Room ${room}`);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="rounded-2xl border border-white/8 p-6" style={{ background: "rgba(255,255,255,0.02)" }}>
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Link2 size={14} /> Define Room Range</h3>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Start Room</label>
            <input type="number" value={startRoom} onChange={e => setStartRoom(e.target.value)} placeholder="101"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <span className="text-slate-600 font-bold pb-3">→</span>
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">End Room</label>
            <input type="number" value={endRoom} onChange={e => setEndRoom(e.target.value)} placeholder="500"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <button onClick={generateRooms} className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all btn-click-effect" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 4px 16px rgba(99,102,241,0.25)" }}>
            Generate
          </button>
        </div>
      </div>

      {rooms.length > 0 && (
        <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="px-6 py-3 border-b border-white/5 flex justify-between items-center" style={{ background: "rgba(255,255,255,0.02)" }}>
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Guest Access Links</span>
            <span className="text-xs text-slate-600">{rooms.length} rooms</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto custom-scroll">
            {rooms.map(room => (
              <div key={room} className="flex items-center justify-between px-6 py-3 border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-white bg-white/8 px-3 py-1.5 rounded-lg">Room {room}</span>
                  <span className="text-xs text-slate-500 font-mono truncate max-w-md">{getLink(room)}</span>
                </div>
                <button onClick={() => copyLink(room)} className="p-2 rounded-lg text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all opacity-0 group-hover:opacity-100">
                  {copied === room ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ INCIDENT AUDIT LOGS ============
export function AuditLogs({ logs, searchTerm, setSearchTerm }) {
  const filtered = logs.filter(l =>
    (l.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.staffName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.incidentId || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ACTION_STYLES = {
    RESOLVED: "bg-green-500/15 text-green-400 border-green-500/20",
    CONFIRMED: "bg-red-500/15 text-red-400 border-red-500/20",
    REJECTED: "bg-slate-500/15 text-slate-400 border-slate-500/20",
    "EN-ROUTE": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="relative w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
          <input type="text" placeholder="Search incidents..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
        <span className="text-xs text-slate-600 font-semibold">{filtered.length} records</span>
      </div>

      <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-600 border-b border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
              <th className="px-6 py-4">Incident Type</th>
              <th className="px-6 py-4">Room / Location</th>
              <th className="px-6 py-4">Time Triggered</th>
              <th className="px-6 py-4">Verified By</th>
              <th className="px-6 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-600">
                <p className="font-bold text-sm">No audit records</p>
              </td></tr>
            ) : filtered.map(l => (
              <tr key={l.docId} className="hover:bg-white/[0.03] transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-white">{l.incidentType || l.action || "—"}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{l.room || l.location || "—"}</td>
                <td className="px-6 py-4 text-xs font-mono text-slate-500">{l.time?.toDate ? l.time.toDate().toLocaleString() : "—"}</td>
                <td className="px-6 py-4 text-sm text-slate-300">{l.staffName || "—"}</td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${ACTION_STYLES[l.action] || "bg-slate-500/15 text-slate-400 border-slate-500/20"}`}>
                    {l.action || "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
