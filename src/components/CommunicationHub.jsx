import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection, addDoc, serverTimestamp, onSnapshot,
  query, orderBy, where, limit
} from "firebase/firestore";
import { toast } from "sonner";
import {
  Radio, Megaphone, Send, User, AlertTriangle,
  Zap, ShieldAlert, MessageSquare, ChevronDown,
  CheckCheck, Clock, X, Loader2
} from "lucide-react";

// ─── Priority Config ───────────────────────────────────────────────────────────
const PRIORITIES = [
  {
    id: "standard",
    label: "Standard Alert",
    description: "Informational broadcast",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.35)",
    glow: "0 0 20px rgba(59,130,246,0.25)",
    Icon: Megaphone,
    pulse: false,
  },
  {
    id: "urgent",
    label: "Urgent Warning",
    description: "Requires immediate attention",
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.35)",
    glow: "0 0 20px rgba(249,115,22,0.25)",
    Icon: AlertTriangle,
    pulse: false,
  },
  {
    id: "evacuation",
    label: "Evacuation Order",
    description: "Site-wide emergency evacuation",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.35)",
    glow: "0 0 30px rgba(239,68,68,0.4)",
    Icon: ShieldAlert,
    pulse: true,
  },
];

// ─── Channel Config ────────────────────────────────────────────────────────────
const CHANNELS = [
  { id: "feed",    label: "Active Feed",           icon: "📡", desc: "Push to dashboard live feed" },
  { id: "flash",   label: "Emergency Overlay",     icon: "🚨", desc: "Trigger sitewide flash overlay" },
  { id: "staff",   label: "Staff App",             icon: "📱", desc: "Push to all staff mobiles" },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CommunicationHub({ hotelID, staffList = [], senderName = "Command" }) {
  const [activeTab, setActiveTab] = useState("broadcast"); // "broadcast" | "direct"
  const [priority, setPriority] = useState("standard");
  const [channels, setChannels] = useState(["feed"]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [recentBroadcasts, setRecentBroadcasts] = useState([]);

  // Direct message state
  const [dmTarget, setDmTarget] = useState(null);
  const [dmText, setDmText] = useState("");
  const [dmSending, setDmSending] = useState(false);
  const [dmHistory, setDmHistory] = useState([]);
  const [showStaffPicker, setShowStaffPicker] = useState(false);
  const staffPickerRef = useRef(null);
  const dmEndRef = useRef(null);

  const priorityCfg = PRIORITIES.find(p => p.id === priority) || PRIORITIES[0];

  // ── Fetch recent broadcasts ──────────────────────────────────────────────────
  useEffect(() => {
    const col = collection(db, "broadcasts");
    const q = hotelID
      ? query(col, where("hotelID", "==", hotelID), orderBy("time", "desc"), limit(15))
      : query(col, orderBy("time", "desc"), limit(15));
    const unsub = onSnapshot(q, snap => {
      setRecentBroadcasts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, [hotelID]);

  // ── Fetch DM history when target changes ────────────────────────────────────
  useEffect(() => {
    if (!dmTarget) return;
    const col = collection(db, "directMessages");
    const q = query(
      col,
      where("hotelID", "==", hotelID || "global"),
      where("toStaffId", "==", dmTarget.id),
      orderBy("time", "asc"),
      limit(50)
    );
    const unsub = onSnapshot(q, snap => {
      setDmHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, [dmTarget, hotelID]);

  // Auto-scroll DM thread
  useEffect(() => {
    dmEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmHistory]);

  // Close staff picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (staffPickerRef.current && !staffPickerRef.current.contains(e.target)) {
        setShowStaffPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Toggle channel ───────────────────────────────────────────────────────────
  const toggleChannel = (id) => {
    setChannels(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // ── Send broadcast ───────────────────────────────────────────────────────────
  const sendBroadcast = async () => {
    if (!message.trim() || channels.length === 0 || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, "broadcasts"), {
        message: message.trim(),
        priority,
        channels,
        hotelID: hotelID || "global",
        sender: senderName,
        time: serverTimestamp(),
      });

      // If "flash" channel selected, also write to emergencyFlash collection
      if (channels.includes("flash")) {
        await addDoc(collection(db, "emergencyFlash"), {
          message: message.trim(),
          priority,
          hotelID: hotelID || "global",
          time: serverTimestamp(),
          active: true,
        });
      }

      toast.success(`Broadcast sent via ${channels.length} channel${channels.length > 1 ? "s" : ""}`, {
        description: `Priority: ${priorityCfg.label}`,
      });
      setMessage("");
    } catch (err) {
      toast.error("Broadcast failed", { description: err.message });
    } finally {
      setSending(false);
    }
  };

  // ── Send direct message ──────────────────────────────────────────────────────
  const sendDM = async () => {
    if (!dmTarget || !dmText.trim() || dmSending) return;
    setDmSending(true);
    try {
      await addDoc(collection(db, "directMessages"), {
        message: dmText.trim(),
        toStaffId: dmTarget.id,
        toStaffName: dmTarget.name,
        from: senderName,
        hotelID: hotelID || "global",
        time: serverTimestamp(),
        read: false,
      });
      setDmText("");
    } catch (err) {
      toast.error("Message failed", { description: err.message });
    } finally {
      setDmSending(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts?.toDate) return "Just now";
    return ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const PRIORITY_BADGE = {
    standard:   { label: "STANDARD",   cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    urgent:     { label: "URGENT",     cls: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
    evacuation: { label: "EVACUATION", cls: "text-red-400 bg-red-500/10 border-red-500/20 animate-pulse" },
  };

  return (
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, rgba(15,15,20,0.95) 0%, rgba(10,10,15,0.98) 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <Radio size={16} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Communication Hub</h2>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Command Broadcast Center</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-black text-green-400 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {[
          { id: "broadcast", label: "Broadcast", Icon: Megaphone },
          { id: "direct",    label: "Direct Msg", Icon: MessageSquare },
          { id: "history",   label: "History",   Icon: Clock },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              color: activeTab === tab.id ? "#ef4444" : "rgba(100,116,139,0.8)",
              borderBottom: activeTab === tab.id ? "2px solid #ef4444" : "2px solid transparent",
              background: activeTab === tab.id ? "rgba(239,68,68,0.04)" : "transparent",
            }}
          >
            <tab.Icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Broadcast Tab ───────────────────────────────────────────────────── */}
      {activeTab === "broadcast" && (
        <div className="flex-1 flex flex-col gap-5 p-5 overflow-y-auto hide-scrollbar">

          {/* Priority Selector */}
          <div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Priority Level</p>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all text-center"
                  style={{
                    background: priority === p.id ? p.bg : "rgba(255,255,255,0.03)",
                    border: `1px solid ${priority === p.id ? p.border : "rgba(255,255,255,0.07)"}`,
                    boxShadow: priority === p.id ? p.glow : "none",
                  }}
                >
                  <p.Icon
                    size={16}
                    style={{ color: priority === p.id ? p.color : "#475569" }}
                    className={p.pulse && priority === p.id ? "animate-pulse" : ""}
                  />
                  <span
                    className="text-[9px] font-black uppercase tracking-wider leading-tight"
                    style={{ color: priority === p.id ? p.color : "#475569" }}
                  >
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Channel Routing */}
          <div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Channel Routing</p>
            <div className="flex flex-col gap-2">
              {CHANNELS.map(ch => {
                const active = channels.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-left"
                    style={{
                      background: active ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"}`,
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: active ? "#ef4444" : "transparent",
                        border: `2px solid ${active ? "#ef4444" : "rgba(255,255,255,0.15)"}`,
                      }}
                    >
                      {active && <span className="text-white text-[8px] font-black">✓</span>}
                    </div>
                    <span className="text-base">{ch.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white">{ch.label}</p>
                      <p className="text-[10px] text-slate-600">{ch.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Composer */}
          <div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Message</p>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${priorityCfg.border}`, boxShadow: sending ? "none" : priorityCfg.glow }}
            >
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) sendBroadcast(); }}
                placeholder={
                  priority === "evacuation"
                    ? "EVACUATION ORDER: All guests and staff must..."
                    : priority === "urgent"
                    ? "URGENT: Immediate action required..."
                    : "Broadcast message to all connected channels..."
                }
                rows={3}
                className="w-full resize-none text-sm text-white placeholder-slate-700 focus:outline-none px-4 py-3"
                style={{ background: "rgba(255,255,255,0.03)" }}
              />
              <div
                className="flex items-center justify-between px-4 py-2"
                style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span className="text-[10px] text-slate-700">Ctrl+Enter to send</span>
                <span className="text-[10px] text-slate-700">{message.length}/500</span>
              </div>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={sendBroadcast}
            disabled={!message.trim() || channels.length === 0 || sending}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all btn-click-effect disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: sending ? "#1f1f2e" : `linear-gradient(135deg, ${priorityCfg.color}, ${priorityCfg.color}bb)`,
              boxShadow: sending ? "none" : priorityCfg.glow,
            }}
          >
            {sending ? (
              <><Loader2 size={15} className="animate-spin" /> Transmitting…</>
            ) : (
              <><Send size={15} /> Broadcast to {channels.length} Channel{channels.length !== 1 ? "s" : ""}</>
            )}
          </button>
        </div>
      )}

      {/* ── Direct Message Tab ──────────────────────────────────────────────── */}
      {activeTab === "direct" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Staff selector */}
          <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">Select Staff</p>
            <div className="relative" ref={staffPickerRef}>
              <button
                onClick={() => setShowStaffPicker(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {dmTarget ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                      <User size={12} className="text-indigo-400" />
                    </div>
                    <span className="text-white font-semibold">{dmTarget.name}</span>
                    <span className="text-[10px] text-slate-600 font-mono">{dmTarget.id}</span>
                  </div>
                ) : (
                  <span className="text-slate-600">Choose a staff member…</span>
                )}
                <ChevronDown size={14} className="text-slate-600" />
              </button>

              {showStaffPicker && staffList.length > 0 && (
                <div
                  className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl overflow-hidden"
                  style={{ background: "#0f0f18", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}
                >
                  {staffList.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setDmTarget(s); setShowStaffPicker(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center flex-shrink-0">
                        <User size={13} className="text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{s.name}</p>
                        <p className="text-[10px] text-slate-600 font-mono">{s.id} · {s.role}</p>
                      </div>
                      <div className={`ml-auto w-2 h-2 rounded-full ${s.onDuty ? "bg-green-400" : "bg-slate-700"}`} />
                    </button>
                  ))}
                  {staffList.length === 0 && (
                    <div className="px-4 py-4 text-center text-xs text-slate-600">No staff registered</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* DM Thread */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 hide-scrollbar">
            {!dmTarget ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-700 gap-3 py-10">
                <MessageSquare size={32} className="opacity-30" />
                <p className="text-xs">Select a staff member to start a conversation</p>
              </div>
            ) : dmHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-700 gap-3 py-10">
                <MessageSquare size={28} className="opacity-30" />
                <p className="text-xs">No messages yet. Start the conversation.</p>
              </div>
            ) : (
              dmHistory.map(msg => (
                <div key={msg.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{msg.from}</span>
                    <span className="text-[9px] text-slate-700">{formatTime(msg.time)}</span>
                  </div>
                  <div
                    className="px-3 py-2 rounded-xl text-xs text-white max-w-[85%]"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {msg.message}
                  </div>
                  {msg.read && (
                    <div className="flex items-center gap-1">
                      <CheckCheck size={10} className="text-blue-400" />
                      <span className="text-[9px] text-slate-700">Read</span>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={dmEndRef} />
          </div>

          {/* DM Input */}
          <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={dmText}
                onChange={e => setDmText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) sendDM(); }}
                placeholder={dmTarget ? `Message ${dmTarget.name}…` : "Select staff first"}
                disabled={!dmTarget}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-700 focus:outline-none transition-all disabled:opacity-40"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <button
                onClick={sendDM}
                disabled={!dmTarget || !dmText.trim() || dmSending}
                className="px-4 py-2.5 rounded-xl font-bold text-white transition-all btn-click-effect disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 4px 15px rgba(99,102,241,0.3)" }}
              >
                {dmSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── History Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 hide-scrollbar">
          {recentBroadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-700 gap-3">
              <Radio size={32} className="opacity-30" />
              <p className="text-xs">No broadcasts yet</p>
            </div>
          ) : (
            recentBroadcasts.map(b => {
              const pCfg = PRIORITIES.find(p => p.id === b.priority) || PRIORITIES[0];
              const badge = PRIORITY_BADGE[b.priority] || PRIORITY_BADGE.standard;
              return (
                <div
                  key={b.id}
                  className="flex flex-col gap-2 p-4 rounded-xl"
                  style={{ background: pCfg.bg, border: `1px solid ${pCfg.border}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-[10px] text-slate-600 shrink-0">{formatTime(b.time)}</span>
                  </div>
                  <p className="text-xs text-white">{b.message}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] text-slate-600">From: <span className="text-slate-400 font-semibold">{b.sender}</span></span>
                    <div className="flex gap-1">
                      {(b.channels || []).map(ch => {
                        const chCfg = CHANNELS.find(c => c.id === ch);
                        return chCfg ? (
                          <span key={ch} className="text-[9px] px-1.5 py-0.5 rounded text-slate-400" style={{ background: "rgba(255,255,255,0.06)" }}>
                            {chCfg.icon} {chCfg.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// Named export for PRIORITY_BADGE used in history tab
const PRIORITY_BADGE = {
  standard:   { label: "STANDARD",   cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  urgent:     { label: "URGENT",     cls: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  evacuation: { label: "EVACUATION", cls: "text-red-400 bg-red-500/10 border-red-500/20 animate-pulse" },
};
