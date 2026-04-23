import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { db } from "./firebase";
import { 
  collection, addDoc, serverTimestamp, query, onSnapshot, 
  orderBy, doc, updateDoc, getDocs, where, writeBatch 
} from "firebase/firestore";
import { 
  Flame, Activity, ShieldAlert, AlertTriangle, Clock, 
  CheckCircle, Navigation, LayoutDashboard, Settings, 
  LogIn, LogOut, X, MapPin, Send, Phone, ShieldCheck 
} from "lucide-react";
import { Toaster, toast } from "sonner";

// Components
import MapModule from "./MapComponent";
import NearbyServices from "./components/NearbyServices";
import DepartmentView from "./components/DepartmentView";
import GuestSafety from "./components/GuestSafety";
import HotelAdmin from "./components/HotelAdmin";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";

// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================
function AppDashboard() {
  const [user, setUser] = useState(null); // { id, role } | null
  const [alerts, setAlerts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingAlert, setPendingAlert] = useState(null); // { type } — waiting for location pin
  const [showNearbyServices, setShowNearbyServices] = useState(false);
  const [selectedAlertType, setSelectedAlertType] = useState("FIRE");
  const [enquiries, setEnquiries] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("time", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAlerts(data.filter(a => a.status !== "Resolved"));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "staff"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaff(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "enquiries"), where("status", "==", "PENDING"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEnquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Audio ping for PENDING_VERIFICATION
  useEffect(() => {
    if (user?.role === 'staff' && !user?.onDuty) return;

    const hasPending = alerts.some(a => a.status === "PENDING_VERIFICATION");
    if (!hasPending) return;

    // Use a simple AudioContext beep
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const interval = setInterval(() => {
      if(ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }, 10000); // every 10 seconds
    
    return () => { clearInterval(interval); ctx.close(); };
  }, [alerts]);

  // Siren for MEDICAL alerts
  useEffect(() => {
    if (user?.role === 'staff' && !user?.onDuty) return;

    const activeMedical = alerts.some(a => a.type === "MEDICAL" && a.status === "CONFIRMED");
    if (!activeMedical) return;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const interval = setInterval(() => {
      if(ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }, 1200); 
    
    return () => { clearInterval(interval); ctx.close(); };
  }, [alerts]);

  // Handle staff confirmation/rejection of alerts
  const verifyAlert = async (id, status) => {
    const alertRef = doc(db, "alerts", id);
    const promise = updateDoc(alertRef, { status });
    
    // Log action
    addDoc(collection(db, "logs"), {
      staffName: user?.name || user?.id || "Staff",
      action: status,
      incidentId: id,
      time: serverTimestamp()
    });

    toast.promise(promise, {
      loading: "Updating status...",
      success: `Alert marked as ${status}.`,
      error: "Error updating status.",
    });
  };

  // Step 1: open location picker
  const sendAlert = (type) => {
    if (!user) {
      toast.error("You must be logged in to trigger an alert.", { description: "Please log in first." });
      setShowLogin(true);
      return;
    }
    setPendingAlert({ type });
  };

  // Open nearby services modal
  const openNearbyServices = (type) => {
    setSelectedAlertType(type);
    setShowNearbyServices(true);
  };

  // Step 2: called after user pins a location on the map
  const confirmAlert = async ({ type, coords, locationLabel }) => {
    setPendingAlert(null);
    let finalStatus = "PENDING_VERIFICATION";
    
    if (type === "MEDICAL" || user?.role === 'staff') {
      finalStatus = "CONFIRMED";
    } else {
      // Threshold check
      const q = query(
        collection(db, "alerts"), 
        where("type", "==", type),
        where("location", "==", locationLabel),
        where("status", "==", "PENDING_VERIFICATION")
      );
      const snapshot = await getDocs(q);
      if (snapshot.docs.length >= 4) { // This is the 5th
        finalStatus = "CONFIRMED";
        // Batch update old ones
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => {
          batch.update(d.ref, { status: "CONFIRMED" });
        });
        await batch.commit();
      }
    }

    const promise = addDoc(collection(db, "alerts"), {
      type,
      status: finalStatus,
      location: locationLabel,
      coords,
      triggeredBy: user?.id ?? user ?? "Guest",
      time: serverTimestamp(),
    });
    toast.promise(promise, {
      loading: `Dispatching ${type} alert...`,
      success: `${type} alert sent! Status: ${finalStatus}`,
      error: `Failed to send ${type} alert.`,
    });
  };

  const resolveAlert = async (id, type) => {
    const alertRef = doc(db, "alerts", id);
    const promise = updateDoc(alertRef, { status: "RESOLVED" });

    // Log action
    addDoc(collection(db, "logs"), {
      staffName: user?.name || user?.id || "Staff",
      action: "RESOLVED",
      incidentId: id,
      time: serverTimestamp()
    });

    toast.promise(promise, {
      loading: "Resolving incident...",
      success: `${type} incident cleared.`,
      error: "Error updating status.",
    });
  };


  return (
    <div className="flex bg-[#0a0a0c] text-white min-h-screen font-sans relative">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* Sidebar - Visual Only for now */}
      <aside className="w-20 border-r border-white/5 flex flex-col items-center py-10 gap-8 glass hidden md:flex">
        <div className="p-3 bg-red-500/20 rounded-2xl text-red-500 mb-6">
          <Navigation size={28} />
        </div>
        <nav className="flex flex-col gap-8 text-slate-400">
          <button aria-label="Go to Dashboard" title="Dashboard">
            <LayoutDashboard className="text-red-500 cursor-pointer" />
          </button>
          <button aria-label="View Active Incidents" title="Active Incidents">
            <Activity className="hover:text-white cursor-pointer transition-colors" />
          </button>
          <button aria-label="Security Settings" title="Security Settings">
            <ShieldAlert className="hover:text-white cursor-pointer transition-colors" />
          </button>
          <button aria-label="Settings" title="Settings">
            <Settings className="hover:text-white cursor-pointer transition-colors" />
          </button>
          <div className="mt-auto mb-4 border-t border-white/5 pt-8">
            <button 
              onClick={() => window.location.href='/admin'} 
              aria-label="Admin Portal" 
              title="Admin Portal"
              className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-lg shadow-indigo-500/20"
            >
              <ShieldCheck size={20} />
            </button>
          </div>
        </nav>
      </aside>


      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-10 py-6 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white m-0">Crisis Control <span className="text-red-500">Center</span></h1>
            <p className="text-slate-400 text-sm">Real-time hospitality emergency response</p>
          </div>
          <div className="flex gap-4 items-center">
            {user ? (
              <>
                <div className="px-4 py-2 glass rounded-lg text-sm flex items-center gap-2">
                  <span className="text-slate-400 mr-2 border-r border-white/10 pr-2 font-mono">{user?.id ?? user}</span>
                  {user?.role && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-bold" style={{ background: user.role === 'staff' ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.15)', color: user.role === 'staff' ? '#f87171' : '#94a3b8' }}>{user.role}</span>}
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  System Active
                </div>
                <button
                  onClick={() => setUser(null)}
                  title="Logout"
                  aria-label="Logout"
                  className="p-2 glass rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button
                id="login-btn"
                onClick={() => setShowLogin(v => !v)}
                aria-label="Login"
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-all btn-click-effect shadow-lg shadow-red-900/30"
              >
                <LogIn size={16} />
                Login
              </button>
            )}
          </div>
        </header>

        {/* Login Panel — fixed overlay so it's never clipped */}
        {showLogin && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowLogin(false)}
              aria-hidden="true"
            />
            {/* Panel */}
            <div className="fixed top-20 right-6 z-50" role="dialog" aria-modal="true" aria-label="Login panel">
              <LoginPanel
                onLogin={({ id, role }) => { setUser({ id, role }); setShowLogin(false); }}
                onClose={() => setShowLogin(false)}
              />
            </div>
          </>
        )}

        {/* Location Picker Modal */}
        {pendingAlert && (
          <LocationPickerModal
            alertType={pendingAlert.type}
            onConfirm={(data) => confirmAlert({ type: pendingAlert.type, ...data })}
            onCancel={() => setPendingAlert(null)}
          />
        )}

        {/* Nearby Services Modal */}
        <NearbyServices
          isOpen={showNearbyServices}
          onClose={() => setShowNearbyServices(false)}
          emergencyType={selectedAlertType}
          center={{ lat: 22.7196, lng: 75.8577 }}
        />

        {/* Enquiry Notification */}
        {enquiries.length > 0 && (
          <div className="fixed bottom-10 left-10 z-50 animate-bounce">
            <div className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.6)] border-2 border-red-400 flex items-center gap-4">
              <div className="w-3 h-3 bg-white rounded-full animate-ping" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Department Enquiry</span>
                <span className="text-sm font-bold">{enquiries[0].message}</span>
              </div>
              <button 
                onClick={async () => {
                   const batch = writeBatch(db);
                   enquiries.forEach(e => batch.update(doc(db, "enquiries", e.id), { status: "RESOLVED" }));
                   await batch.commit();
                }}
                className="ml-4 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-[10px] font-black"
              >
                ACKNOWLEDGE
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-10 flex flex-col lg:flex-row gap-8">
          {/* Controls & Feed */}
          <div className="lg:w-1/3 flex flex-col gap-8">
            <section className="glass rounded-3xl p-8 shadow-2xl">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Flame size={20} className="text-red-500" /> Panic Triggers
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <TriggerButton onClick={() => sendAlert("FIRE")} color="bg-red-500" icon={<Flame />} label="FIRE" />
                <TriggerButton onClick={() => sendAlert("MEDICAL")} color="bg-blue-600" icon={<Activity />} label="MEDICAL" />
                <TriggerButton onClick={() => sendAlert("SECURITY")} color="bg-orange-600" icon={<ShieldAlert />} label="SECURITY" />
                <TriggerButton onClick={() => sendAlert("OTHER")} color="bg-slate-600" icon={<AlertTriangle />} label="OTHER" />
              </div>
              
              {/* Emergency Services Quick Access */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Access</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => openNearbyServices("FIRE")}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 transition text-xs font-semibold"
                    title="Find nearby fire stations"
                  >
                    <span>🚒</span>
                    Fire Stations
                  </button>
                  <button
                    onClick={() => openNearbyServices("MEDICAL")}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition text-xs font-semibold"
                    title="Find nearby hospitals"
                  >
                    <span>🏥</span>
                    Hospitals
                  </button>
                </div>
              </div>
            </section>

            <section className="flex-1 glass rounded-3xl p-8 overflow-hidden flex flex-col">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Clock size={20} className="text-slate-400" /> Active Feed
              </h2>
              <div className="flex-1 overflow-y-auto pr-2 custom-scroll flex flex-col gap-4">
                {alerts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10 opacity-50">
                    <CheckCircle size={48} className="mb-4" />
                    <p>All facilities secure</p>
                  </div>
                ) : (
                  alerts
                    .filter(a => a.status !== "RESOLVED" && a.status !== "REJECTED")
                    .map((alert) => (
                    <AlertCard 
                      key={alert.id} 
                      alert={alert} 
                      onResolve={() => resolveAlert(alert.id, alert.type)} 
                      onConfirm={() => verifyAlert(alert.id, "CONFIRMED")}
                      onDispatch={() => verifyAlert(alert.id, "EN-ROUTE")}
                      onReject={() => verifyAlert(alert.id, "REJECTED")}
                      userRole={user?.role} 
                    />
                  ))
                )}
              </div>
            </section>
          </div>
          {/* Map Section */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex-1 relative glass rounded-3xl overflow-hidden shadow-2xl p-2">
              <div className="absolute top-6 left-6 z-10 px-4 py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl text-xs font-medium text-slate-300">
                Live Deployment Map
              </div>
              <MapModule alerts={alerts} staff={staff} />
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6">
              <StatsCard label="Active Alerts" value={alerts.length} color="text-red-500" />
              <StatsCard label="Field Staff" value={staff.length} color="text-blue-500" />
              <StatsCard label="Avg Response" value="1.2m" color="text-green-500" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS & UTILS
// ==========================================
function TriggerButton({ onClick, color, icon, label }) {
  return (
    <button 
      onClick={onClick}
      aria-label={`Trigger ${label} alert`}
      title={`Trigger ${label} alert`}
      className={`${color} btn-click-effect hover:brightness-110 p-6 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-black/20 group translate-y-0 hover:-translate-y-1`}
    >
      <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-xs font-bold tracking-widest">{label}</span>
    </button>
  );
}

function AlertCard({ alert, onResolve, onConfirm, onDispatch, onReject, userRole }) {
  const colors = {
    FIRE: "border-red-500/50 from-red-500/10 to-transparent",
    MEDICAL: "border-blue-500/50 from-blue-500/10 to-transparent",
    SECURITY: "border-orange-500/50 from-orange-500/10 to-transparent",
    OTHER: "border-slate-500/50 from-slate-500/10 to-transparent",
  };

  const isPending = alert.status === "PENDING_VERIFICATION";

  return (
    <div className={`flex flex-col gap-3 p-5 rounded-2xl border-l-4 bg-gradient-to-r ${colors[alert.type || 'OTHER']} border ${isPending ? 'border-yellow-500/50 animate-pulse' : 'border-white/5'}`}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            {alert.type} Emergency 
            {isPending && <span className="ml-2 text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full">UNVERIFIED</span>}
            {alert.status === "CONFIRMED" && <span className="ml-2 text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full animate-pulse">CONFIRMED</span>}
            {alert.status === "EN-ROUTE" && <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full">EN-ROUTE</span>}
            {alert.status === "RESOLVED" && <span className="ml-2 text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">RESOLVED</span>}
          </h4>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin size={10} className="inline" /> {alert.location || "Location not set"}
          </p>
        </div>
        {userRole === 'staff' && alert.status !== "RESOLVED" && (
          <button 
            onClick={onResolve}
            aria-label={`Mark ${alert.type} incident as resolved`}
            title={`Mark ${alert.type} incident as resolved`}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-500 rounded-lg btn-click-effect hover:bg-green-500 hover:text-white transition-all group"
          >
            <CheckCircle size={16} />
            <span className="text-[10px] font-black tracking-widest hidden group-hover:inline uppercase">Resolve</span>
          </button>
        )}
      </div>

      {isPending && userRole === 'staff' && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button 
            onClick={onConfirm}
            className="py-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black rounded tracking-widest"
          >
            CONFIRM ALERT
          </button>
          <button 
            onClick={onReject}
            className="py-2 bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] font-bold rounded"
          >
            REJECT
          </button>
        </div>
      )}

      {alert.status === "CONFIRMED" && userRole === 'staff' && (
         <button 
          onClick={onDispatch}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded tracking-widest mt-2 animate-pulse"
        >
          CONFIRM & DISPATCH
        </button>
      )}



      {/* Reporter ID */}
      {alert.triggeredBy && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Reported by</span>
            <span className="text-[11px] font-mono font-bold text-slate-200 bg-white/5 px-2 py-0.5 rounded-md">
              {alert.triggeredBy}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            {alert.time?.toDate ? alert.time.toDate().toLocaleTimeString() : 'Just now'}
          </span>
        </div>
      )}
    </div>
  );
}

function StatsCard({ label, value, color }) {
  return (
    <div className="glass p-5 rounded-2xl flex flex-col items-center gap-1">
      <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">{label}</span>
      <span className={`text-2xl font-black ${color}`}>{value}</span>
    </div>
  );
}

function LoginPanel({ onLogin, onClose }) {
  const [id, setId] = useState("");
  const [role, setRole] = useState("staff");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (id.trim() === "") return;
    setIsLoading(true);
    
    const typedId = id.trim();

    if (role === 'staff' || role === 'admin') {
      try {
        const staffRef = collection(db, "staff");
        const snapshot = await getDocs(staffRef);
        
        // Case-insensitive match
        const match = snapshot.docs.find(d => {
          const staffId = d.data().id || "";
          return staffId.toLowerCase() === typedId.toLowerCase();
        });
        
        if (match) {
          const data = match.data();
          onLogin({ 
            id: data.id, 
            role: data.role || role, 
            name: data.name,
            onDuty: data.onDuty ?? true 
          });
        } else {
          toast.error("Invalid ID", { description: "This ID is not on the authorized staff list." });
        }
      } catch (err) {
        console.error("Login Error:", err);
        toast.error("System Error", { description: "Could not connect to authentication server." });
      }
    } else {
      onLogin({ id: typedId, role: 'guest' });
    }
    
    setIsLoading(false);
  };

  const placeholder = role === "staff" ? "e.g. STAFF-001" : "e.g. GUEST-456";

  return (
    <div
      className="w-[340px] flex flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/60"
      style={{ background: "linear-gradient(160deg, #16161c 0%, #0e0e12 100%)", animation: "slideDown 0.2s ease" }}
    >
      {/* Header strip */}
      <div className="relative flex items-center justify-between px-5 pt-5 pb-4">
        {/* Red glow blob */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-red-600/20 blur-2xl rounded-full pointer-events-none" />

        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20">
            <ShieldAlert size={18} className="text-red-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#16161c]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">System Access</h2>
            <p className="text-[11px] text-slate-500 leading-tight">Crisis Control Center</p>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close login panel"
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/8 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Role tabs */}
      <div className="mx-5 mb-4 grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
        {["staff", "admin", "guest"].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => { setRole(r); setId(""); setTimeout(() => inputRef.current?.focus(), 50); }}
            className={`py-2 rounded-lg text-[10px] font-bold tracking-wide transition-all duration-200 capitalize ${
              role === r
                ? "bg-red-600 text-white shadow-md shadow-red-900/40"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {r === "staff" ? "👤 Staff" : r === "admin" ? "🛡️ Admin" : "🛎️ Guest"}
          </button>
        ))}
      </div>

      {/* Form body */}
      <form onSubmit={handleSubmit} className="px-5 pb-5 flex flex-col gap-3">
        {/* Input */}
        <div className="relative">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            {role === "staff" ? "Staff ID" : "Guest ID"}
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-4 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/70 transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              required
              autoComplete="off"
            />
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading || id.trim() === ""}
          className="w-full py-3 rounded-xl text-white text-sm font-bold tracking-wide transition-all duration-200 btn-click-effect relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isLoading ? "#7f1d1d" : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
            boxShadow: "0 4px 20px rgba(220,38,38,0.25)"
          }}
        >
          <span className={`flex items-center justify-center gap-2 transition-opacity ${isLoading ? "opacity-0" : "opacity-100"}`}>
            <LogIn size={15} />
            Enter System
          </span>
          {isLoading && (
            <span className="absolute inset-0 flex items-center justify-center gap-2 text-red-200">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Authenticating…
            </span>
          )}
        </button>

        {/* Footer notice */}
        <p className="text-center text-[10px] text-slate-600 mt-1">
          🔒 Secured access · Authorized personnel only
        </p>
      </form>
    </div>
  );
}

// Map click events handled via onClick prop on <Map> directly (vis.gl API)

const ALERT_COLORS = {
  FIRE: "#ef4444",
  MEDICAL: "#3b82f6",
  SECURITY: "#f97316",
  OTHER: "#64748b",
};

const ALERT_EMOJIS = {
  FIRE: "🔥",
  MEDICAL: "🚑",
  SECURITY: "🛡️",
  OTHER: "⚠️",
};

// Haversine distance in km
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const STATION_CONFIG = {
  FIRE:     { amenities: ['fire_station'],        emoji: '🚒', label: 'Fire Stations',    color: '#ef4444' },
  MEDICAL:  { amenities: ['hospital', 'clinic'],  emoji: '🏥', label: 'Hospitals',        color: '#3b82f6' },
  SECURITY: { amenities: ['police'],              emoji: '👮', label: 'Police Stations',  color: '#f97316' },
  OTHER:    { amenities: ['hospital', 'fire_station', 'police'], emoji: '🆘', label: 'Emergency Services', color: '#64748b' },
};

const PIN_CONFIG = {
  FIRE:     { bg: '#ef4444', border: '#b91c1c' },
  MEDICAL:  { bg: '#3b82f6', border: '#1d4ed8' },
  SECURITY: { bg: '#f97316', border: '#c2410c' },
  OTHER:    { bg: '#64748b', border: '#475569' },
};

function LocationPickerModal({ alertType, onConfirm, onCancel }) {
  const [pinned, setPinned] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAq9afG542PH6dlxtnm3-dJS5-hozfW53Q';
  const MAP_ID = 'bf50a9291fa2784d';
  const hotelCenter = { lat: 22.7196, lng: 75.8577 };
  const accentColor = ALERT_COLORS[alertType] || "#ef4444";
  const pinCfg = PIN_CONFIG[alertType] || PIN_CONFIG.OTHER;
  const stationCfg = STATION_CONFIG[alertType] || STATION_CONFIG.OTHER;

  const reverseGeocode = async (lat, lng) => {
    setGeocoding(true);
    setLocationName("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`,
        { headers: { "User-Agent": "CrisisControlCenter/1.0" } }
      );
      const data = await res.json();
      if (data && data.address) {
        const a = data.address;
        const parts = [
          a.amenity || a.building || a.hotel || a.tourism || a.shop || a.office,
          a.road || a.pedestrian || a.footway,
          a.suburb || a.neighbourhood || a.city_district || a.quarter,
          a.city || a.town || a.village,
        ].filter(Boolean);
        setLocationName(parts.slice(0, 3).join(", ") || data.display_name.split(",").slice(0, 3).join(",").trim());
      } else {
        setLocationName("Pinned Location");
      }
    } catch {
      setLocationName("Pinned Location");
    } finally {
      setGeocoding(false);
    }
  };

  const fetchNearbyStations = async (lat, lng) => {
    setLoadingStations(true);
    setStations([]);
    try {
      // Use nwr (node + way + relation) so polygon-mapped facilities are included
      // out center; gives centroid lat/lon for ways and relations
      const amenityUnion = stationCfg.amenities
        .map(a => `nwr[amenity=${a}](around:10000,${lat},${lng});`)
        .join("");
      const query = `[out:json][timeout:15];(${amenityUnion});out center;`;
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      });
      const data = await res.json();
      const results = (data.elements || [])
        .map(el => {
          // Nodes have el.lat/el.lon directly; ways/relations have el.center
          const elLat = el.lat ?? el.center?.lat;
          const elLng = el.lon ?? el.center?.lon;
          if (elLat == null || elLng == null) return null;
          return {
            id: el.id,
            name: el.tags?.name || el.tags?.['name:en'] || el.tags?.['name:hi'] || "Unnamed Station",
            amenity: el.tags?.amenity,
            lat: elLat,
            lng: elLng,
            dist: haversine(lat, lng, elLat, elLng),
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5);
      setStations(results);
    } catch {
      setStations([]);
    } finally {
      setLoadingStations(false);
    }
  };

  const handleMapClick = (e) => {
    const lat = e.detail.latLng.lat;
    const lng = e.detail.latLng.lng;
    setPinned({ lat, lng });
    reverseGeocode(lat, lng);
    fetchNearbyStations(lat, lng);
  };

  const handleConfirm = () => {
    if (!pinned) return;
    const locationLabel = locationName || "Pinned Location";
    onConfirm({ coords: pinned, locationLabel });
  };

  const AMENITY_EMOJI = { fire_station: '🚒', hospital: '🏥', clinic: '🏥', police: '👮' };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "rgba(10,10,12,0.92)", backdropFilter: "blur(12px)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}44` }}>
            {ALERT_EMOJIS[alertType]}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{alertType} Alert — Pin Location</h2>
            <p className="text-[11px] text-slate-500">Click anywhere on the map to mark the incident location</p>
          </div>
        </div>
        <button onClick={onCancel} aria-label="Cancel location picker" className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Body: map + stations side-by-side */}
      <div className="flex-1 flex overflow-hidden">

        {/* Map */}
        <div className="flex-1 relative">
          <APIProvider apiKey={API_KEY}>
            <Map
              defaultCenter={hotelCenter}
              defaultZoom={16}
              disableDefaultUI={true}
              mapId={MAP_ID}
              className="w-full h-full"
              onClick={handleMapClick}
            >
              {/* Incident pin — colored per crisis type */}
              {pinned && (
                <AdvancedMarker position={pinned} title={`${alertType} incident`}>
                  <div style={{
                    position: 'absolute',
                    transform: 'translate(-50%, -100%)',
                  }}>
                    <div style={{
                      width: '36px', height: '36px',
                      backgroundColor: pinCfg.bg,
                      border: `3px solid ${pinCfg.border}`,
                      borderRadius: '50% 50% 50% 0',
                      transform: 'rotate(-45deg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '2px 2px 8px rgba(0,0,0,0.3)'
                    }}>
                      <span style={{ transform: 'rotate(45deg)', fontSize: '18px' }}>
                        {ALERT_EMOJIS[alertType]}
                      </span>
                    </div>
                  </div>
                </AdvancedMarker>
              )}
              {/* Nearby station pins */}
              {stations.map(s => (
                <AdvancedMarker key={s.id} position={{ lat: s.lat, lng: s.lng }} title={s.name}>
                  <div style={{
                    background: stationCfg.color + '22',
                    border: `2px solid ${stationCfg.color}88`,
                    borderRadius: '50%',
                    width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, backdropFilter: 'blur(4px)',
                  }}>
                    {AMENITY_EMOJI[s.amenity] || '📍'}
                  </div>
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>

          {/* Crosshair hint */}
          {!pinned && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="px-5 py-3 rounded-2xl text-sm text-slate-300 font-medium flex items-center gap-2" style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <MapPin size={16} className="text-red-400" />
                Tap the map to drop a pin
              </div>
            </div>
          )}
        </div>

        {/* Nearby stations sidebar */}
        {pinned && (
          <div className="w-72 flex flex-col border-l border-white/8 overflow-y-auto" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>{stationCfg.emoji}</span> Nearest {stationCfg.label}
              </p>
            </div>
            {loadingStations ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
                <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-xs">Searching nearby…</span>
              </div>
            ) : stations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-600 px-4 text-center">
                <span className="text-3xl">🔍</span>
                <span className="text-xs">No stations found within 8 km</span>
              </div>
            ) : (
              <div className="flex flex-col gap-0">
                {stations.map((s, i) => (
                  <div
                    key={s.id}
                    className="px-4 py-3 border-b border-white/5 flex items-start gap-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                      style={{ background: stationCfg.color + '18', border: `1px solid ${stationCfg.color}33` }}>
                      {AMENITY_EMOJI[s.amenity] || '📍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {s.dist < 1
                          ? `${Math.round(s.dist * 1000)} m away`
                          : `${s.dist.toFixed(1)} km away`}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 mt-0.5">#{i + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="px-6 py-4 border-t border-white/8 flex items-center justify-between gap-4" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="text-sm">
          {pinned ? (
            <span className="text-slate-300 text-xs bg-white/5 px-3 py-1.5 rounded-lg border border-white/8 flex items-center gap-2 max-w-xs">
              <MapPin size={12} className="shrink-0 text-red-400" />
              {geocoding
                ? <span className="text-slate-500 italic">Fetching location…</span>
                : <span className="truncate">{locationName || "Pinned Location"}</span>}
            </span>
          ) : (
            <span className="text-slate-600 text-xs">No location selected yet</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!pinned || geocoding}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all btn-click-effect disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: (pinned && !geocoding) ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : "#333",
              boxShadow: (pinned && !geocoding) ? `0 4px 20px ${accentColor}44` : "none"
            }}
          >
            {geocoding ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Resolving location…
              </>
            ) : (
              <>
                <Send size={14} />
                Dispatch {alertType} Alert
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN APP ENTRY (ROUTING)
// ==========================================
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppDashboard />} />
        <Route path="/admin" element={<HotelAdmin />} />
        <Route path="/guest" element={<GuestSafety />} />
        <Route path="/department" element={<DepartmentView />} />
      </Routes>
    </BrowserRouter>
  );
}
