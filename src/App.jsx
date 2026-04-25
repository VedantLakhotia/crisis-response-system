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
  LogIn, LogOut, X, MapPin, Send, Phone, ShieldCheck, MessageSquare, BookOpen
} from "lucide-react";
import { Toaster, toast } from "sonner";

// Components
import MapModule from "./MapComponent";
import NearbyServices from "./components/NearbyServices";
import DepartmentView from "./components/DepartmentView";
import GuestSafety from "./components/GuestSafety";
import HotelAdmin from "./components/HotelAdmin";
import CommunicationHub from "./components/CommunicationHub";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";

// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================
function AppDashboard() {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('crisisUser');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  }); // { id, role } | null — persisted across refreshes
  const [alerts, setAlerts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingAlert, setPendingAlert] = useState(null); // { type } — waiting for location pin
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(() => {
    try { 
      const s = localStorage.getItem('crisisSettings');
      return s ? JSON.parse(s) : { audioAlerts: true, incidentThreshold: 5, autoDispatchMedical: true };
    } catch { return { audioAlerts: true, incidentThreshold: 5, autoDispatchMedical: true }; }
  });
  const [showNearbyServices, setShowNearbyServices] = useState(false);
  const [selectedAlertType, setSelectedAlertType] = useState("FIRE");
  const [nearbyCenter, setNearbyCenter] = useState({ lat: 22.7196, lng: 75.8577 });
  const [enquiries, setEnquiries] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("time", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => {
        const raw = d.data() || {};
        return {
          id: d.id,
          ...raw,
          status: (raw.status || "").toString().toUpperCase(),
          type: (raw.type || "").toString().toUpperCase(),
        };
      });
      setAlerts(data.filter(a => a.status !== "RESOLVED"));
    }, (err) => {
      console.error("Alerts subscription error:", err);
      toast.error("Feed not updating", {
        description: err?.message || "Firestore subscription failed (check indexes/rules).",
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "staff"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaff(data);
    }, (err) => {
      console.error("Staff subscription error:", err);
      toast.error("Staff not updating", {
        description: err?.message || "Firestore subscription failed (check indexes/rules).",
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "enquiries"), where("status", "==", "PENDING"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEnquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Enquiries subscription error:", err);
      toast.error("Enquiries not updating", {
        description: err?.message || "Firestore subscription failed (check indexes/rules).",
      });
    });
    return () => unsubscribe();
  }, []);

  // Audio ping for PENDING_VERIFICATION
  useEffect(() => {
    if (!settings.audioAlerts) return;
    if (user?.role?.toLowerCase() !== 'guest' && !user?.onDuty) return;

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
    if (!settings.audioAlerts) return;
    if (user?.role?.toLowerCase() !== 'guest' && !user?.onDuty) return;

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
    const role = (user?.role || "").toString().toLowerCase();
    const canManage = role === "staff" || role === "admin";
    if (!canManage) {
      toast.error("Unauthorized", { description: "Only staff/admin can update incidents." });
      return;
    }
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
    if (coords?.lat != null && coords?.lng != null) {
      setNearbyCenter({ lat: coords.lat, lng: coords.lng });
    }
    let finalStatus = "PENDING_VERIFICATION";

    const reporterId = user?.id ?? (typeof user === "string" ? user : "");
    const reporterName =
      user?.name ||
      (user?.role?.toLowerCase() === "guest" ? "Guest" : reporterId) ||
      "Guest";
    
    if ((type === "MEDICAL" && settings.autoDispatchMedical !== false) || user?.role?.toLowerCase() !== 'guest') {
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
      const threshold = (settings.incidentThreshold || 5) - 1;
      if (snapshot.docs.length >= threshold) { 
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
      triggeredBy: reporterId || "Guest",
      triggeredByName: reporterName,
      triggeredById: reporterId || "Guest",
      time: serverTimestamp(),
    });
    toast.promise(promise, {
      loading: `Dispatching ${type} alert...`,
      success: `${type} alert sent! Status: ${finalStatus}`,
      error: `Failed to send ${type} alert.`,
    });
  };

  const resolveAlert = async (id, type) => {
    const role = (user?.role || "").toString().toLowerCase();
    const canManage = role === "staff" || role === "admin";
    if (!canManage) {
      toast.error("Unauthorized", { description: "Only staff/admin can resolve incidents." });
      return;
    }
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

  const userRole = (user?.role || "").toString().toLowerCase();
  const canAccessComms = userRole === "staff" || userRole === "admin";

  return (
    <div className="flex bg-[#0a0a0c] text-white min-h-[100dvh] font-sans relative pb-16 md:pb-0">
      <Toaster position="top-right" theme="dark" richColors />

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-white/10 z-[100] flex justify-around items-center p-4 pb-safe">
        <button aria-label="Go to Dashboard" title="Dashboard" onClick={() => setActiveTab("dashboard")}>
          <LayoutDashboard className={`cursor-pointer transition-colors ${activeTab === 'dashboard' ? 'text-red-500' : 'text-slate-400 hover:text-white'}`} size={24} />
        </button>
        {canAccessComms && (
          <button aria-label="Communication Hub" title="Communication Hub" onClick={() => setActiveTab("comms")}>
            <MessageSquare className={`cursor-pointer transition-colors ${activeTab === 'comms' ? 'text-blue-500' : 'text-slate-400 hover:text-white'}`} size={24} />
          </button>
        )}
        <button aria-label="Emergency Protocols" title="Emergency Protocols" onClick={() => setActiveTab("protocols")}>
          <BookOpen className={`cursor-pointer transition-colors ${activeTab === 'protocols' ? 'text-green-500' : 'text-slate-400 hover:text-white'}`} size={24} />
        </button>
        <button aria-label="Admin Portal" title="Admin Portal" onClick={() => window.location.href='/admin'}>
          <ShieldCheck className="text-slate-400 hover:text-indigo-400 cursor-pointer transition-colors" size={24} />
        </button>
        <button aria-label="Settings" title="Settings" onClick={() => setShowSettings(true)}>
          <Settings className="text-slate-400 hover:text-white cursor-pointer transition-colors" size={24} />
        </button>
      </nav>
      
      {/* Sidebar - Visual Only for now */}
      <aside className="w-20 border-r border-white/5 flex flex-col items-center py-10 gap-8 glass hidden md:flex">
        <div className="p-3 bg-red-500/20 rounded-2xl text-red-500 mb-6">
          <Navigation size={28} />
        </div>
        <nav className="flex-1 w-full flex flex-col items-center gap-8 text-slate-400">
          <button aria-label="Go to Dashboard" title="Dashboard" onClick={() => setActiveTab("dashboard")}>
            <LayoutDashboard className={`cursor-pointer transition-colors ${activeTab === 'dashboard' ? 'text-red-500' : 'hover:text-white'}`} />
          </button>
          {canAccessComms && (
            <button aria-label="Communication Hub" title="Communication Hub" onClick={() => setActiveTab("comms")}>
              <MessageSquare className={`cursor-pointer transition-colors ${activeTab === 'comms' ? 'text-blue-500' : 'hover:text-white'}`} />
            </button>
          )}
          <button aria-label="Emergency Protocols" title="Emergency Protocols" onClick={() => setActiveTab("protocols")}>
            <BookOpen className={`cursor-pointer transition-colors ${activeTab === 'protocols' ? 'text-green-500' : 'hover:text-white'}`} />
          </button>
          <button aria-label="Admin Portal" title="Admin Portal" onClick={() => window.location.href='/admin'}>
            <ShieldCheck className="hover:text-indigo-400 cursor-pointer transition-colors" />
          </button>
          <button aria-label="Settings" title="Settings" onClick={() => setShowSettings(true)}>
            <Settings className="hover:text-white cursor-pointer transition-colors" />
          </button>
        </nav>
      </aside>


      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-4 md:px-10 py-4 md:py-6 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-md shrink-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white m-0">Crisis Control <span className="text-red-500">Center</span></h1>
            <p className="text-slate-400 text-[10px] md:text-sm hidden sm:block">Real-time hospitality emergency response</p>
          </div>
          <div className="flex gap-2 md:gap-4 items-center">
            {user ? (
              <>
                <div className="px-2 md:px-4 py-1.5 md:py-2 glass rounded-lg text-xs md:text-sm flex items-center gap-2 max-w-[150px] md:max-w-none">
                  <span className="text-slate-200 mr-1 md:mr-2 border-r border-white/10 pr-1 md:pr-2 font-semibold truncate">
                    {user?.name || user?.id || user}
                  </span>
                  {user?.role && <span className="text-[9px] md:text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-bold hidden sm:inline-block" style={{ background: user.role === 'staff' ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.15)', color: user.role === 'staff' ? '#f87171' : '#94a3b8' }}>{user.role}</span>}
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0 hidden sm:block" />
                  <span className="hidden sm:inline">System Active</span>
                </div>
                <button
                  onClick={() => { setUser(null); sessionStorage.removeItem('crisisUser'); }}
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
            <div className="fixed top-20 right-4 sm:right-6 left-4 sm:left-auto z-50 flex justify-center sm:block" role="dialog" aria-modal="true" aria-label="Login panel">
              <LoginPanel
                onLogin={(u) => {
                  setUser(u);
                  try { sessionStorage.setItem('crisisUser', JSON.stringify(u)); } catch { /* noop */ }
                  setShowLogin(false);
                }}
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

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal 
            currentSettings={settings}
            onSave={(newSettings) => {
              setSettings(newSettings);
              localStorage.setItem('crisisSettings', JSON.stringify(newSettings));
              setShowSettings(false);
            }}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Nearby Services Modal */}
        <NearbyServices
          isOpen={showNearbyServices}
          onClose={() => setShowNearbyServices(false)}
          emergencyType={selectedAlertType}
          center={nearbyCenter}
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

        <div className="flex-1 overflow-y-auto p-4 md:p-10 flex flex-col lg:flex-row lg:items-start gap-6 md:gap-8">
          {activeTab === 'comms' ? (
            <div className="w-full max-w-4xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col">
              <CommunicationHub
                hotelID={user?.hotelID || null}
                staffList={staff}
                senderName={user?.name || user?.id || "Command"}
              />
            </div>
          ) : activeTab === 'protocols' ? (
            <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 pb-10">
              <div className="glass rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <BookOpen className="text-green-500" size={32} />
                  Emergency Action Protocols
                </h2>
                <p className="text-slate-400 mb-8 max-w-2xl text-sm">
                  Standard Operating Procedures for all personnel during active crisis scenarios. Follow these guidelines strictly unless directed otherwise by Command.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* FIRE */}
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-6 hover:bg-black/60 transition-colors">
                    <h3 className="text-lg font-bold text-red-500 flex items-center gap-2 mb-4">
                      <Flame size={20} /> FIRE EMERGENCY
                    </h3>
                    <ul className="space-y-3 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">✓</span> 
                        <span><strong>DO:</strong> Activate nearest fire alarm immediately upon discovery.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">✓</span> 
                        <span><strong>DO:</strong> Evacuate guests using stairs. Guide them to assembly points.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">✓</span> 
                        <span><strong>DO:</strong> Close doors behind you to contain the spread of fire.</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-400">
                        <span className="text-slate-500 mt-1">✗</span> 
                        <span><strong>DO NOT:</strong> Use elevators under any circumstances.</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-400">
                        <span className="text-slate-500 mt-1">✗</span> 
                        <span><strong>DO NOT:</strong> Attempt to fight fires larger than a small trash can.</span>
                      </li>
                    </ul>
                  </div>

                  {/* MEDICAL */}
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-6 hover:bg-black/60 transition-colors">
                    <h3 className="text-lg font-bold text-blue-500 flex items-center gap-2 mb-4">
                      <Activity size={20} /> MEDICAL EMERGENCY
                    </h3>
                    <ul className="space-y-3 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">✓</span> 
                        <span><strong>DO:</strong> Dispatch medical personnel or call EMS immediately.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">✓</span> 
                        <span><strong>DO:</strong> Bring the AED and First Aid kit to the location.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">✓</span> 
                        <span><strong>DO:</strong> Clear the area of onlookers to give the patient space.</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-400">
                        <span className="text-slate-500 mt-1">✗</span> 
                        <span><strong>DO NOT:</strong> Move the person unless they are in immediate danger.</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-400">
                        <span className="text-slate-500 mt-1">✗</span> 
                        <span><strong>DO NOT:</strong> Administer medication unless trained to do so.</span>
                      </li>
                    </ul>
                  </div>

                  {/* SECURITY */}
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-6 hover:bg-black/60 transition-colors">
                    <h3 className="text-lg font-bold text-orange-500 flex items-center gap-2 mb-4">
                      <ShieldAlert size={20} /> SECURITY THREAT
                    </h3>
                    <ul className="space-y-3 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-1">✓</span> 
                        <span><strong>DO:</strong> Secure the perimeter and lock down affected zones.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-1">✓</span> 
                        <span><strong>DO:</strong> Direct guests to secure, windowless areas if active threat.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-1">✓</span> 
                        <span><strong>DO:</strong> Observe and report details (descriptions, locations) silently.</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-400">
                        <span className="text-slate-500 mt-1">✗</span> 
                        <span><strong>DO NOT:</strong> Engage or confront the threat directly.</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-400">
                        <span className="text-slate-500 mt-1">✗</span> 
                        <span><strong>DO NOT:</strong> Make sudden movements if confronted.</span>
                      </li>
                    </ul>
                  </div>

                  {/* GENERAL NOTIFICATIONS */}
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-6 hover:bg-black/60 transition-colors">
                    <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2 mb-4">
                      <AlertTriangle size={20} /> SYSTEM PROTOCOLS
                    </h3>
                    <ul className="space-y-3 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-slate-200 mt-1">✓</span> 
                        <span><strong>DO:</strong> Acknowledge all alerts within 30 seconds of receipt.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-200 mt-1">✓</span> 
                        <span><strong>DO:</strong> Update alert status via the dashboard as situation evolves.</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-400">
                        <span className="text-slate-500 mt-1">✗</span> 
                        <span><strong>DO NOT:</strong> Ignore unverified guest reports (Thresholds will auto-confirm).</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-400">
                        <span className="text-slate-500 mt-1">✗</span> 
                        <span><strong>DO NOT:</strong> Close communication channels until the ALL CLEAR is given.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Controls & Feed */}
              <div className="w-full lg:w-1/3 flex flex-col gap-6 md:gap-8 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto custom-scroll">
                <section className="glass rounded-3xl p-5 md:p-8 shadow-2xl">
                  <h2 className="text-lg font-semibold mb-4 md:mb-6 flex items-center gap-2">
                <Flame size={20} className="text-red-500" /> Panic Triggers
              </h2>
              <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
                <TriggerButton onClick={() => sendAlert("FIRE")} color="bg-red-500" icon={<Flame />} label="FIRE" />
                <TriggerButton onClick={() => sendAlert("MEDICAL")} color="bg-blue-600" icon={<Activity />} label="MEDICAL" />
                <TriggerButton onClick={() => sendAlert("SECURITY")} color="bg-orange-600" icon={<ShieldAlert />} label="SECURITY" />
                <TriggerButton onClick={() => sendAlert("OTHER")} color="bg-slate-600" icon={<AlertTriangle />} label="OTHER" />
              </div>
              
              {/* Emergency Services Quick Access */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Access</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => openNearbyServices("FIRE")}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 transition text-xs font-semibold"
                    title="Find nearby fire stations"
                  >
                    <span>🚒</span>
                    Fire Stations
                  </button>
                  <button
                    onClick={() => openNearbyServices("MEDICAL")}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition text-xs font-semibold"
                    title="Find nearby hospitals"
                  >
                    <span>🏥</span>
                    Hospitals
                  </button>
                  <button
                    onClick={() => openNearbyServices("SECURITY")}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition text-xs font-semibold"
                    title="Find nearby police stations"
                  >
                    <span>🚔</span>
                    Police
                  </button>
                </div>
              </div>
            </section>

            <section className="relative glass rounded-xl p-5 md:p-6 flex flex-col min-h-[250px] lg:max-h-[calc(100vh-420px)]">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 shrink-0">
                <Clock size={20} className="text-slate-400" /> Active Feed
              </h2>
              <div className="flex-1 overflow-y-auto pr-1 hide-scrollbar flex flex-col gap-4">
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
          <div className="flex-1 w-full flex flex-col gap-6 lg:sticky lg:top-0 self-start min-h-[400px]">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl h-[400px] md:h-auto md:flex-1 w-full">
              <MapModule alerts={alerts} staff={staff} />
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
              <StatsCard label="Active Alerts" value={alerts.length} color="text-red-500" />
              <StatsCard label="Field Staff" value={staff.length} color="text-blue-500" />
              <StatsCard label="Avg Response" value="1.2m" color="text-green-500" />
            </div>
          </div>
          </>
          )}
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
      className={`${color} btn-click-effect hover:brightness-110 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-black/20 group translate-y-0 hover:-translate-y-1`}
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

  const status = (alert.status || "").toString().toUpperCase();
  const isPending = status === "PENDING_VERIFICATION";
  const role = (userRole || "").toString().toLowerCase();
  const canManage = role === "staff" || role === "admin";
  const canResolve = canManage && status !== "RESOLVED" && status !== "REJECTED";
  const canDispatch = canManage && status === "CONFIRMED";

  return (
    <div className={`flex flex-col gap-3 p-5 rounded-2xl border-l-4 bg-gradient-to-r ${colors[alert.type || 'OTHER']} border ${isPending ? 'border-yellow-500/50 animate-pulse' : 'border-white/5'}`}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            {alert.type} Emergency 
            {isPending && <span className="ml-2 text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full">UNVERIFIED</span>}
            {status === "CONFIRMED" && <span className="ml-2 text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full animate-pulse">CONFIRMED</span>}
            {status === "EN-ROUTE" && <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full">EN-ROUTE</span>}
            {status === "RESOLVED" && <span className="ml-2 text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">RESOLVED</span>}
          </h4>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin size={10} className="inline" /> {alert.location || "Location not set"}
          </p>
        </div>
        {/* Keep header clean; resolution is handled in action area */}
      </div>

      {canManage && (
        <div className="mt-1 grid grid-cols-2 gap-2">
          {isPending && (
            <>
              <button
                onClick={onConfirm}
                className="h-10 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-[11px] font-black tracking-widest flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle size={16} />
                CONFIRM
              </button>
              <button
                onClick={onReject}
                className="h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-[11px] font-black tracking-widest flex items-center justify-center gap-2 transition-all border border-white/10"
              >
                <X size={16} />
                REJECT
              </button>
            </>
          )}

          {canDispatch && (
            <button
              onClick={onDispatch}
              className="col-span-2 h-10 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white text-[11px] font-black tracking-widest flex items-center justify-center gap-2 transition-all animate-pulse"
            >
              <Send size={16} />
              DISPATCH TEAM
            </button>
          )}

          {status === "EN-ROUTE" && (
            <button
              onClick={onResolve}
              className="col-span-2 h-10 rounded-xl bg-green-600/90 hover:bg-green-500 text-white text-[11px] font-black tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <CheckCircle size={16} />
              MARK RESOLVED
            </button>
          )}

          {/* Fallback resolve (e.g. confirmed but no dispatch flow) */}
          {canResolve && status !== "EN-ROUTE" && !isPending && !canDispatch && (
            <button
              onClick={onResolve}
              className="col-span-2 h-10 rounded-xl bg-green-600/20 hover:bg-green-600/30 text-green-200 text-[11px] font-black tracking-widest flex items-center justify-center gap-2 transition-all border border-green-500/20"
            >
              <CheckCircle size={16} />
              MARK RESOLVED
            </button>
          )}
        </div>
      )}


      {/* Reporter */}
      {(alert.triggeredByName || alert.triggeredById || alert.triggeredBy) && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
          <div className="flex items-start gap-2 min-w-0">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Reported by</span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-200 truncate">
                {alert.triggeredByName || alert.triggeredBy || "Guest"}
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                {alert.triggeredById || alert.triggeredBy || ""}
              </div>
            </div>
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

    if (role === 'staff') {
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
      className="w-full sm:w-[340px] max-w-[340px] flex flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/60"
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
      <div className="mx-5 mb-4 grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
        {["staff", "guest"].map((r) => (
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
            {r === "staff" ? "👤 Staff" : "🛎️ Guest"}
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

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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
    <div className="fixed inset-0 z-[200] flex flex-col h-[100dvh] w-screen overflow-hidden" style={{ background: "rgba(10,10,12,0.92)", backdropFilter: "blur(12px)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0" style={{ background: "rgba(255,255,255,0.03)" }}>
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
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

        {/* Map */}
        <div className="flex-1 relative min-h-0">
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
          <div className="w-full md:w-72 h-1/3 md:h-full flex flex-col border-t md:border-t-0 md:border-l border-white/8 overflow-y-auto shrink-0" style={{ background: "rgba(255,255,255,0.02)" }}>
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
      <div className="px-4 md:px-6 py-4 border-t border-white/8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="text-sm w-full sm:w-auto">
          {pinned ? (
            <span className="text-slate-300 text-xs bg-white/5 px-3 py-1.5 rounded-lg border border-white/8 flex items-center gap-2 w-full sm:max-w-xs">
              <MapPin size={12} className="shrink-0 text-red-400" />
              {geocoding
                ? <span className="text-slate-500 italic">Fetching location…</span>
                : <span className="truncate block">{locationName || "Pinned Location"}</span>}
            </span>
          ) : (
            <span className="text-slate-600 text-xs">No location selected yet</span>
          )}
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-colors w-full sm:w-auto">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!pinned || geocoding}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all btn-click-effect disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
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

function SettingsModal({ currentSettings, onSave, onClose }) {
  const [settings, setSettings] = useState(currentSettings);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    onSave(settings);
    toast.success("Settings saved successfully.");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-[#16161c] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings size={20} className="text-slate-400" />
            System Settings
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Audio Alerts */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Audio Alerts</h3>
              <p className="text-[11px] text-slate-400">Play sounds for incoming and critical incidents.</p>
            </div>
            <button 
              onClick={() => toggleSetting('audioAlerts')}
              className={`w-11 h-6 rounded-full transition-colors relative ${settings.audioAlerts ? 'bg-red-500' : 'bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.audioAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Incident Threshold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-white">Guest Report Threshold</h3>
                <p className="text-[11px] text-slate-400">Number of guest reports before auto-confirming.</p>
              </div>
              <span className="text-lg font-bold text-red-500">{settings.incidentThreshold}</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={settings.incidentThreshold || 5} 
              onChange={e => setSettings(p => ({ ...p, incidentThreshold: parseInt(e.target.value) }))}
              className="w-full accent-red-500"
            />
          </div>

          {/* Auto Dispatch Medical */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Auto-Confirm Medical</h3>
              <p className="text-[11px] text-slate-400">Instantly confirm all guest medical reports.</p>
            </div>
            <button 
              onClick={() => toggleSetting('autoDispatchMedical')}
              className={`w-11 h-6 rounded-full transition-colors relative ${settings.autoDispatchMedical ? 'bg-red-500' : 'bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.autoDispatchMedical ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 bg-black/20 border-t border-white/10 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-900/30 transition-all btn-click-effect"
          >
            Save Settings
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
