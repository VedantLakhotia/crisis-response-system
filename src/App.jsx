import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore";
import { Flame, Activity, ShieldAlert, AlertTriangle, Clock, CheckCircle, Navigation, LayoutDashboard, Settings, MoreVertical } from "lucide-react";
import { Toaster, toast } from "sonner";
import MapModule from "./MapComponent";

function App() {
  const [alerts, setAlerts] = useState([]);
  const [staff, setStaff] = useState([]);

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

  const sendAlert = async (type) => {
    const locations = {
      FIRE: { lat: 22.7125, lng: 75.8762 },
      MEDICAL: { lat: 22.7150, lng: 75.8700 },
      SECURITY: { lat: 22.7100, lng: 75.8800 },
      OTHER: { lat: 22.7180, lng: 75.8750 }
    };

    const promise = addDoc(collection(db, "alerts"), {
      type: type,
      status: "Pending",
      location: "Zone " + (Math.floor(Math.random() * 10) + 1),
      coords: locations[type], 
      time: serverTimestamp(),
    });

    toast.promise(promise, {
      loading: `Sending ${type} alert...`,
      success: `${type} alert dispatched to all responders!`,
      error: `Failed to send ${type} alert.`,
    });
  };

  const resolveAlert = async (id, type) => {
    const alertRef = doc(db, "alerts", id);
    const promise = updateDoc(alertRef, { status: "Resolved" });

    toast.promise(promise, {
      loading: "Resolving incident...",
      success: `${type} incident cleared.`,
      error: "Error updating status.",
    });
  };

  return (
    <div className="flex bg-[#0a0a0c] text-white min-height-screen font-sans">
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
        </nav>
      </aside>


      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-10 py-6 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white m-0">Crisis Control <span className="text-red-500">Center</span></h1>
            <p className="text-slate-400 text-sm">Real-time hospitality emergency response</p>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 glass rounded-lg text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              System Active
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 flex flex-col lg:flex-row gap-8">
          {/* Controls & Feed */}
          <div className="lg:w-1/3 flex flex-col gap-8">
            <section className="glass rounded-3xl p-8 shadow-2xl">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Flame size={20} className="text-red-500" /> Panic Triggers
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <TriggerButton onClick={() => sendAlert("FIRE")} color="bg-red-500" icon={<Flame />} label="FIRE" />
                <TriggerButton onClick={() => sendAlert("MEDICAL")} color="bg-blue-600" icon={<Activity />} label="MEDICAL" />
                <TriggerButton onClick={() => sendAlert("SECURITY")} color="bg-orange-600" icon={<ShieldAlert />} label="SECURITY" />
                <TriggerButton onClick={() => sendAlert("OTHER")} color="bg-slate-600" icon={<AlertTriangle />} label="OTHER" />
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
                  alerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} onResolve={() => resolveAlert(alert.id, alert.type)} />
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

// Sub-components for cleaner code
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

function AlertCard({ alert, onResolve }) {
  const colors = {
    FIRE: "border-red-500/50 from-red-500/10 to-transparent",
    MEDICAL: "border-blue-500/50 from-blue-500/10 to-transparent",
    SECURITY: "border-orange-500/50 from-orange-500/10 to-transparent",
    OTHER: "border-slate-500/50 from-slate-500/10 to-transparent",
  };

  return (
    <div className={`flex flex-col gap-4 p-5 rounded-2xl border-l-4 bg-gradient-to-r ${colors[alert.type || 'OTHER']} border border-white/5`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">{alert.type} Emergency</h4>
          <p className="text-xs text-slate-400">Position: {alert.location}</p>
        </div>
        <button 
          onClick={onResolve}
          aria-label={`Mark ${alert.type} incident as resolved`}
          title={`Mark ${alert.type} incident as resolved`}
          className="p-2 bg-green-500/20 text-green-500 rounded-lg btn-click-effect hover:bg-green-500 hover:text-white"
        >
          <CheckCircle size={18} />
        </button>
      </div>
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

export default App;