import { useState, useEffect, useRef, useCallback } from "react";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore";
import { Flame, Activity, ShieldAlert, AlertTriangle, Clock, CheckCircle, Navigation, LayoutDashboard, Settings, LogIn, LogOut, X, MapPin, Send } from "lucide-react";
import { Toaster, toast } from "sonner";
import MapModule from "./MapComponent";
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

export default function StaffDashboard() {
  const user = auth.currentUser;
  const [alerts, setAlerts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [pendingAlert, setPendingAlert] = useState(null); // { type } — waiting for location pin
  const [instructionText, setInstructionText] = useState("");

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

  // Step 1: open location picker
  const sendAlert = (type) => {
    if (!user) {
      toast.error("You must be logged in to trigger an alert.");
      return;
    }
    setPendingAlert({ type });
  };

  // Step 2: called after user pins a location on the map
  const confirmAlert = async ({ type, coords, locationLabel }) => {
    setPendingAlert(null);
    const promise = addDoc(collection(db, "alerts"), {
      type,
      status: "Pending",
      location: locationLabel,
      coords,
      triggeredBy: user?.email || "Staff",
      time: serverTimestamp(),
    });
    toast.promise(promise, {
      loading: `Dispatching ${type} alert...`,
      success: `${type} alert sent! Location pinned on map.`,
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
                  <span className="text-slate-400 mr-2 border-r border-white/10 pr-2 font-mono">{user?.email}</span>
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>STAFF</span>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  System Active
                </div>
                <button
                  onClick={() => signOut(auth)}
                  title="Logout"
                  aria-label="Logout"
                  className="p-2 glass rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : null}
          </div>
        </header>



        {/* Location Picker Modal */}
        {pendingAlert && (
          <LocationPickerModal
            alertType={pendingAlert.type}
            onConfirm={(data) => confirmAlert({ type: pendingAlert.type, ...data })}
            onCancel={() => setPendingAlert(null)}
          />
        )}

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
                    <AlertCard key={alert.id} alert={alert} onResolve={() => resolveAlert(alert.id, alert.type)} userRole="staff" />
                  ))
                )}
              </div>
            </section>
            
            {/* Push Instructions to Guests */}
            <section className="glass rounded-3xl p-8 shadow-2xl flex flex-col">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Send size={20} className="text-blue-500" /> Push Instructions
              </h2>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={instructionText}
                  onChange={e => setInstructionText(e.target.value)}
                  placeholder="Broadcast message to all guests..."
                  className="flex-1 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/70 transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onKeyDown={e => {
                    if(e.key === 'Enter' && instructionText.trim()) {
                      addDoc(collection(db, "instructions"), { text: instructionText, time: serverTimestamp(), author: user?.email });
                      setInstructionText("");
                      toast.success("Instruction broadcasted to all guests!");
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if(instructionText.trim()) {
                      addDoc(collection(db, "instructions"), { text: instructionText, time: serverTimestamp(), author: user?.email });
                      setInstructionText("");
                      toast.success("Instruction broadcasted to all guests!");
                    }
                  }}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold transition-colors flex items-center gap-2"
                >
                  Push
                </button>
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

function AlertCard({ alert, onResolve, userRole }) {
  const colors = {
    FIRE: "border-red-500/50 from-red-500/10 to-transparent",
    MEDICAL: "border-blue-500/50 from-blue-500/10 to-transparent",
    SECURITY: "border-orange-500/50 from-orange-500/10 to-transparent",
    OTHER: "border-slate-500/50 from-slate-500/10 to-transparent",
  };

  return (
    <div className={`flex flex-col gap-3 p-5 rounded-2xl border-l-4 bg-gradient-to-r ${colors[alert.type || 'OTHER']} border border-white/5`}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">{alert.type} Emergency</h4>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin size={10} className="inline" /> {alert.location || "Location not set"}
          </p>
        </div>
        {userRole === 'staff' && (
          <button 
            onClick={onResolve}
            aria-label={`Mark ${alert.type} incident as resolved`}
            title={`Mark ${alert.type} incident as resolved`}
            className="p-2 bg-green-500/20 text-green-500 rounded-lg btn-click-effect hover:bg-green-500 hover:text-white flex-shrink-0"
          >
            <CheckCircle size={18} />
          </button>
        )}
      </div>
      {/* Reporter ID */}
      {alert.triggeredBy && (
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Reported by</span>
          <span className="text-[11px] font-mono font-bold text-slate-200 bg-white/5 px-2 py-0.5 rounded-md">
            {alert.triggeredBy}
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

