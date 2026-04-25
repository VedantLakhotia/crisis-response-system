import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToString } from 'react-dom/server';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from "./firebase";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getAllServices } from './utils/nearbyServices.js';
import { Flame, HeartPulse, ShieldAlert, AlertTriangle, Building2, Activity, Truck, Navigation, Info, Hospital as HospitalIcon } from 'lucide-react';

// Fix for default Leaflet marker icons not showing in Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- HELPER: CONVERT REACT ICON TO LEAFLET DIV ICON ---
const getCustomIcon = (type, isTarget = false, angle = 0) => {
  let iconHtml = "";
  let className = "relative flex items-center justify-center";

  switch (type) {
    case 'FIRE':
      iconHtml = renderToString(
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-20 scale-110" />
          {isTarget && <div className="absolute inset-0 border-2 border-white rounded-full animate-pulse scale-125 opacity-60" />}
          <Flame size={32} className="text-red-500 relative z-10 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
        </div>
      );
      break;
    case 'MEDICAL':
      iconHtml = renderToString(
        <div className="relative flex items-center justify-center">
          {isTarget && <div className="absolute inset-0 border-2 border-white rounded-full animate-pulse scale-125 opacity-60" />}
          <HeartPulse size={32} className="text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
        </div>
      );
      break;
    case 'SECURITY':
      iconHtml = renderToString(<ShieldAlert size={32} className="text-orange-500" />);
      break;
    case 'FIRE_STATION':
      iconHtml = renderToString(
        <div className="w-10 h-10 bg-red-900/80 border-2 border-red-500/50 rounded-lg flex items-center justify-center shadow-lg relative">
          <Building2 size={20} className="text-white" />
          <span className="absolute -bottom-2 bg-red-600 text-[8px] font-black px-1 rounded text-white">FS</span>
        </div>
      );
      break;
    case 'HOSPITAL':
      iconHtml = renderToString(
        <div className="w-10 h-10 bg-blue-900/80 border-2 border-blue-500/50 rounded-lg flex items-center justify-center shadow-lg relative">
          <Activity size={20} className="text-white" />
          <span className="absolute -bottom-2 bg-blue-600 text-[8px] font-black px-1 rounded text-white">H</span>
        </div>
      );
      break;
    case 'STAFF':
      iconHtml = renderToString(
        <div className="p-1 bg-blue-600/80 rounded-full border-2 border-white/50 shadow-lg">
          <Navigation size={14} className="text-white fill-white" />
        </div>
      );
      break;
    case 'POLICE_STATION':
      iconHtml = renderToString(
        <div className="w-10 h-10 bg-orange-900/80 border-2 border-orange-500/50 rounded-lg flex items-center justify-center shadow-lg relative">
          <ShieldAlert size={20} className="text-white" />
          <span className="absolute -bottom-2 bg-orange-600 text-[8px] font-black px-1 rounded text-white">PS</span>
        </div>
      );
      break;
    case 'VEHICLE_FIRE':
      iconHtml = renderToString(
        <div style={{ transform: `rotate(${angle}deg) ${Math.abs(angle) > 90 ? 'scaleY(-1)' : ''}`, transition: 'transform 0.2s linear' }}>
          <Truck size={32} className="text-red-500 bg-black/80 p-1.5 rounded-lg border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
        </div>
      );
      break;
    case 'VEHICLE_MEDICAL':
      iconHtml = renderToString(
        <div style={{ transform: `rotate(${angle}deg) ${Math.abs(angle) > 90 ? 'scaleY(-1)' : ''}`, transition: 'transform 0.2s linear' }}>
          <Truck size={32} className="text-blue-500 bg-black/80 p-1.5 rounded-lg border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        </div>
      );
      break;
    case 'VEHICLE_SECURITY':
      iconHtml = renderToString(
        <div style={{ transform: `rotate(${angle}deg) ${Math.abs(angle) > 90 ? 'scaleY(-1)' : ''}`, transition: 'transform 0.2s linear' }}>
          <Truck size={32} className="text-orange-500 bg-black/80 p-1.5 rounded-lg border-2 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
        </div>
      );
      break;
    case 'TARGET':
      iconHtml = renderToString(
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-20 scale-[1.2]" />
          <div className="w-4 h-4 border-2 border-white/50 rounded-full flex items-center justify-center shadow-md">
             <div className="w-1 h-1 bg-white/80 rounded-full" />
          </div>
        </div>
      );
      break;
    default:
      iconHtml = renderToString(<AlertTriangle size={32} className="text-slate-400" />);
  }

  return L.divIcon({
    html: iconHtml,
    className: className,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// --- DISPATCH TIME PERSISTENCE (survives page refresh) ---
const DISPATCH_TIMES_KEY = 'crisisDispatchTimes';
const getStoredTimes = () => {
  try { return JSON.parse(sessionStorage.getItem(DISPATCH_TIMES_KEY) || '{}'); } catch { return {}; }
};
const saveDispatchTime = (id, ms) => {
  const t = getStoredTimes(); t[id] = ms;
  try { sessionStorage.setItem(DISPATCH_TIMES_KEY, JSON.stringify(t)); } catch { /* noop */ }
};
const removeDispatchTime = (id) => {
  const t = getStoredTimes(); delete t[id];
  try { sessionStorage.setItem(DISPATCH_TIMES_KEY, JSON.stringify(t)); } catch { /* noop */ }
};

// --- MAIN ENHANCED MAP COMPONENT ---
function MapComponent({ alerts = [], staff = [], showServices = true }) {
  const hotelCenter = [22.7196, 75.8577];
  const [services, setServices] = useState({ fireStations: [], hospitals: [], policeStations: [] });
  // Multiple simultaneous dispatches: { [alertId]: { etaSec, truckPos: [lat,lng], unitType } }
  const [dispatches, setDispatches] = useState({});
  const [hoveredName, setHoveredName] = useState(null);
  const controllersRef = useRef(new Map()); // alertId -> { stop() }

  useEffect(() => {
    if (showServices) {
      const allServices = getAllServices();
      setServices(allServices);
    }
  }, [showServices]);

  useEffect(() => {
    const enRoute = alerts.filter(a => a.status === "EN-ROUTE" && a.coords && a.id);
    const enRouteIds = new Set(enRoute.map(a => a.id));

    // Stop simulations for alerts no longer en-route
    for (const [id, ctrl] of controllersRef.current.entries()) {
      if (!enRouteIds.has(id)) {
        try { ctrl?.stop?.(); } catch { /* noop */ }
        controllersRef.current.delete(id);
        removeDispatchTime(id);
        setDispatches(prev => {
          if (!prev[id]) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }

    // Start simulations for new en-route alerts
    enRoute.forEach((alert) => {
      if (controllersRef.current.has(alert.id)) return;

      const unitType = alert.type || "FIRE";
      // 1. Find NEAREST station/hospital to crisis location
      let serviceList = services.fireStations;
      if (unitType === "MEDICAL") serviceList = services.hospitals;
      else if (unitType === "SECURITY") serviceList = services.policeStations;

      let nearestService = null;
      
      if (serviceList && serviceList.length > 0 && alert.coords) {
        nearestService = serviceList.reduce((prev, curr) => {
          // Calculate Euclidean distance to find nearest
          const d1 = Math.sqrt(
            Math.pow(curr.coords.lat - alert.coords.lat, 2) + 
            Math.pow(curr.coords.lng - alert.coords.lng, 2)
          );
          const d2 = Math.sqrt(
            Math.pow(prev.coords.lat - alert.coords.lat, 2) + 
            Math.pow(prev.coords.lng - alert.coords.lng, 2)
          );
          return d1 < d2 ? curr : prev;
        });
        
        // Log dispatch origin
        console.log(`[DISPATCH] ${unitType} from ${nearestService.name} to ${alert.location}`);
      }

      // Use nearest service if available, otherwise fallback
      let startPos = { lat: 22.6900, lng: 75.8300 }; // Default Fire
      if (nearestService) {
        startPos = nearestService.coords;
      } else {
        if (unitType === "MEDICAL") startPos = { lat: 22.7300, lng: 75.8700 };
        else if (unitType === "SECURITY") startPos = { lat: 22.7150, lng: 75.8550 };
      }
      const targetPos = alert.coords;

      let updateTimer = null;
      let stopped = false;

      const stop = () => {
        stopped = true;
        if (updateTimer) clearInterval(updateTimer);
      };

      controllersRef.current.set(alert.id, { stop });
      setDispatches(prev => ({
        ...prev,
        [alert.id]: { etaSec: null, truckPos: [startPos.lat, startPos.lng], unitType }
      }));

      // 2. Fetch Shortest Path from OSRM and start animation
      (async () => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${startPos.lng},${startPos.lat};${targetPos.lng},${targetPos.lat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();
          if (stopped) return;

          if (data.routes && data.routes[0]) {
            const coordinates = data.routes[0].geometry.coordinates; // [lng, lat]
            const totalDuration = data.routes[0].duration; // seconds
            
            // Calculate cumulative distance along polyline for smooth interpolation
            const dist = (p1, p2) => Math.sqrt(Math.pow(p1[0]-p2[0], 2) + Math.pow(p1[1]-p2[1], 2));
            const cumDists = [0];
            for (let i = 1; i < coordinates.length; i++) {
              cumDists.push(cumDists[i-1] + dist(coordinates[i-1], coordinates[i]));
            }
            const totalDist = cumDists[cumDists.length - 1];

            // Resume from stored start time if we have one (page-refresh resilience)
            const storedTimes = getStoredTimes();
            const startMs = storedTimes[alert.id] ?? Date.now();
            if (!storedTimes[alert.id]) saveDispatchTime(alert.id, startMs);

            // Calculate the correct remaining time immediately (avoids glitch on reload)
            const elapsedOnLoad = (Date.now() - startMs) / 1000;
            const remainingOnLoad = Math.max(0, totalDuration - elapsedOnLoad);

            const routePath = coordinates.map(c => [c[1], c[0]]); // Leaflet uses [lat, lng]

            setDispatches(prev => ({
              ...prev,
              [alert.id]: { ...(prev[alert.id] || {}), etaSec: remainingOnLoad, unitType, path: routePath }
            }));

            // SYNCHRONIZED UPDATE: Use elapsed time for both ETA and vehicle position
            updateTimer = setInterval(() => {
              if (stopped) return;
              const elapsedSec = (Date.now() - startMs) / 1000;
              const remaining = Math.max(0, totalDuration - elapsedSec);
              
              // Calculate progress (0 to 1)
              const progress = Math.min(1, elapsedSec / totalDuration);
              
              // Interpolate vehicle position smoothly along the actual physical distance of the route
              let currentPos = [targetPos.lat, targetPos.lng]; // fallback
              let currentAngle = 0;
              let currentRemainingPath = [];
              
              if (progress >= 1 || totalDist === 0) {
                currentPos = [targetPos.lat, targetPos.lng];
                currentRemainingPath = [];
              } else {
                const targetDist = progress * totalDist;
                for (let i = 1; i < coordinates.length; i++) {
                  if (cumDists[i] >= targetDist) {
                    const segmentDist = cumDists[i] - cumDists[i-1];
                    const segmentProgress = segmentDist === 0 ? 0 : (targetDist - cumDists[i-1]) / segmentDist;
                    const [lng1, lat1] = coordinates[i-1];
                    const [lng2, lat2] = coordinates[i];
                    currentPos = [
                      lat1 + (lat2 - lat1) * segmentProgress,
                      lng1 + (lng2 - lng1) * segmentProgress
                    ];
                    
                    const dy = lat2 - lat1;
                    const dx = lng2 - lng1;
                    if (dx !== 0 || dy !== 0) {
                      currentAngle = Math.atan2(-dy, dx) * (180 / Math.PI);
                    }
                    
                    currentRemainingPath = [currentPos, ...routePath.slice(i)];
                    break;
                  }
                }
              }
              
              setDispatches(prev => {
                let finalAngle = currentAngle;
                if (progress >= 1 && prev[alert.id]) {
                  finalAngle = prev[alert.id].angle || 0; // retain angle when stopped
                }
                return {
                  ...prev,
                  [alert.id]: { ...(prev[alert.id] || {}), etaSec: remaining, truckPos: currentPos, angle: finalAngle, path: currentRemainingPath }
                };
              });
              
              if (remaining <= 0) {
                clearInterval(updateTimer);
                // Auto-resolve: vehicle has arrived at crisis location
                (async () => {
                  try {
                    await updateDoc(doc(db, "alerts", alert.id), { status: "RESOLVED" });
                    await addDoc(collection(db, "logs"), {
                      staffName: "Dispatch System",
                      action: "RESOLVED",
                      incidentId: alert.id,
                      time: serverTimestamp(),
                      note: "Auto-resolved: response unit arrived on scene"
                    });
                    console.log(`[DISPATCH] Alert ${alert.id} auto-resolved — unit arrived.`);
                  } catch (err) {
                    console.error("Auto-resolve failed:", err);
                  }
                })();
              }
            }, 100);
          }
        } catch (err) {
          console.error("Routing error:", err);
        }
      })();
    });
  }, [alerts, services]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      for (const ctrl of controllersRef.current.values()) {
        try { ctrl?.stop?.(); } catch { /* noop */ }
      }
      controllersRef.current.clear();
    };
  }, []);

  return (
    <div className="relative h-full min-h-[400px] sm:min-h-[500px] lg:h-[600px] w-full rounded-3xl overflow-hidden shadow-lg border border-white/10 bg-black z-0">
      <MapContainer 
        center={hotelCenter} 
        zoom={14} 
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="map-tiles-dark"
        />

        {/* 1. FIRE STATIONS */}
        {showServices && services.fireStations.map((station) => (
          <Marker 
            key={station.id} 
            position={[station.coords.lat, station.coords.lng]}
            icon={getCustomIcon('FIRE_STATION')}
            eventHandlers={{
              mouseover: () => setHoveredName(`Fire Station: ${station.name}`),
              mouseout: () => setHoveredName(null),
            }}
          />
        ))}

        {/* 2. HOSPITALS */}
        {showServices && services.hospitals.map((hospital) => (
          <Marker 
            key={hospital.id} 
            position={[hospital.coords.lat, hospital.coords.lng]}
            icon={getCustomIcon('HOSPITAL')}
            eventHandlers={{
              mouseover: () => setHoveredName(`Hospital: ${hospital.name}`),
              mouseout: () => setHoveredName(null),
            }}
          />
        ))}

        {/* 2.5 POLICE STATIONS */}
        {showServices && services.policeStations && services.policeStations.map((station) => (
          <Marker 
            key={station.id} 
            position={[station.coords.lat, station.coords.lng]}
            icon={getCustomIcon('POLICE_STATION')}
            eventHandlers={{
              mouseover: () => setHoveredName(`Police Station: ${station.name}`),
              mouseout: () => setHoveredName(null),
            }}
          />
        ))}

        {/* 3. ALERTS (Only show active crises) */}
        {alerts
          .filter(a => a.status !== "RESOLVED" && a.status !== "REJECTED")
          .map((alert) => {
            const isTarget = alert.status === "EN-ROUTE";
            return alert.coords && (
              <Marker 
                key={alert.id} 
                position={[alert.coords.lat, alert.coords.lng]}
                icon={getCustomIcon(alert.type, isTarget)}
                eventHandlers={{
                  mouseover: () => setHoveredName(`${isTarget ? "DEPLOYMENT TARGET: " : ""}${alert.type} EMERGENCY - ${alert.location}`),
                  mouseout: () => setHoveredName(null),
                }}
              />
            );
          })}
        
        {/* 4. STAFF */}
        {staff.map((member) => (
          member.coords && (
            <Marker 
              key={member.id} 
              position={[member.coords.lat, member.coords.lng]}
              icon={getCustomIcon('STAFF')}
            />
          )
        ))}

        {/* 5. DISPATCH UNIT TRACKING & ROUTES */}
        {Object.entries(dispatches).map(([id, d]) => {
          let unitIconType = "VEHICLE_FIRE";
          let routeColor = "#ef4444";
          
          if (d.unitType === "MEDICAL") {
            unitIconType = "VEHICLE_MEDICAL";
            routeColor = "#3b82f6";
          } else if (d.unitType === "SECURITY") {
            unitIconType = "VEHICLE_SECURITY";
            routeColor = "#f97316";
          }

          return (
            <React.Fragment key={id}>
              {d.path && d.path.length > 0 && (
                <Polyline positions={d.path} color={routeColor} weight={5} opacity={0.6} dashArray="8, 8" />
              )}
              {d.truckPos && (
                <Marker
                  position={d.truckPos}
                  icon={getCustomIcon(unitIconType, false, d.angle || 0)}
                />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Floating Tooltip */}
      <AnimatePresence>
        {hoveredName && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 right-4 z-[1000] bg-black/90 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl flex items-center gap-2 shadow-2xl pointer-events-none"
          >
            <Info size={14} className="text-blue-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">{hoveredName}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays */}
      <div className="absolute top-6 left-6 z-[1000] px-4 py-2 glass rounded-xl text-[10px] font-black text-slate-300 border border-white/5 flex items-center gap-2 tracking-[0.2em] pointer-events-none">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        LIVE.DISPATCH_ACTIVE
      </div>

      {Object.keys(dispatches).length > 0 && (
        <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '220px' }}>
          {Object.entries(dispatches).slice(0, 3).map(([id, d]) => {
            const etaSec = d?.etaSec;
            const unitType = d?.unitType || "FIRE";
            const isMedical = unitType === "MEDICAL";
            const isSecurity = unitType === "SECURITY";
            
            let cardColorClass = "bg-red-900/80 border-red-500/50 shadow-red-500/20";
            if (isMedical) cardColorClass = "bg-blue-900/80 border-blue-500/50 shadow-blue-500/20";
            else if (isSecurity) cardColorClass = "bg-orange-900/80 border-orange-500/50 shadow-orange-500/20";

            return (
              <div
                key={id}
                className={`px-3 py-2 border rounded-xl shadow-lg flex items-center gap-3 text-white ${cardColorClass} backdrop-blur-lg`}
              >
                <div className="p-1.5 bg-white/10 rounded-lg">
                  {isMedical ? <Truck size={16} className="text-blue-400 animate-pulse" /> : isSecurity ? <Truck size={16} className="text-orange-400 animate-pulse" /> : <Truck size={16} className="text-red-400 animate-bounce" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[0.15em] opacity-60">ETA</p>
                  <p className="text-sm font-black tabular-nums leading-tight">
                    {etaSec == null ? "--" : etaSec > 60 ? `${Math.floor(etaSec / 60)}m ` : ""}{etaSec == null ? "" : `${Math.ceil(etaSec % 60)}s`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[7px] font-bold text-green-400 animate-pulse uppercase">En-Route</p>
                </div>
              </div>
            );
          })}
          {Object.keys(dispatches).length > 3 && (
            <div className="text-center text-[9px] text-slate-300/70 font-semibold">
              +{Object.keys(dispatches).length - 3} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MapComponent;
