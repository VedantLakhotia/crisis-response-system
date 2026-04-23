import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToString } from 'react-dom/server';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";
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
const getCustomIcon = (type, isTarget = false) => {
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
    case 'VEHICLE_FIRE':
      iconHtml = renderToString(<Truck size={32} className="text-red-500 bg-black/80 p-1.5 rounded-lg border border-red-400" />);
      break;
    case 'VEHICLE_MEDICAL':
      iconHtml = renderToString(<Activity size={32} className="text-blue-500 bg-black/80 p-1.5 rounded-lg border border-blue-400" />);
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

// --- MAIN ENHANCED MAP COMPONENT ---
function MapComponent({ alerts = [], staff = [], showServices = true }) {
  const hotelCenter = [22.7196, 75.8577];
  const [services, setServices] = useState({ fireStations: [], hospitals: [] });
  const [eta, setEta] = useState(null);
  const [truckPos, setTruckPos] = useState(null);
  const [activeUnitType, setActiveUnitType] = useState("FIRE");
  const [hoveredName, setHoveredName] = useState(null);

  useEffect(() => {
    if (showServices) {
      setServices(getAllServices());
    }
  }, [showServices]);

  useEffect(() => {
    const dispatchedAlert = alerts.find(a => a.status === "EN-ROUTE");
    if (!dispatchedAlert) {
      setEta(null);
      setTruckPos(null);
      return;
    }

    setActiveUnitType(dispatchedAlert.type || "FIRE");
    
    // 1. Find nearest station/hospital
    const serviceList = dispatchedAlert.type === "MEDICAL" ? services.hospitals : services.fireStations;
    let nearestService = null;
    if (serviceList && serviceList.length > 0 && dispatchedAlert.coords) {
      nearestService = serviceList.reduce((prev, curr) => {
        const d1 = Math.sqrt(Math.pow(curr.coords.lat - dispatchedAlert.coords.lat, 2) + Math.pow(curr.coords.lng - dispatchedAlert.coords.lng, 2));
        const d2 = Math.sqrt(Math.pow(prev.coords.lat - dispatchedAlert.coords.lat, 2) + Math.pow(prev.coords.lng - dispatchedAlert.coords.lng, 2));
        return d1 < d2 ? curr : prev;
      });
    }

    const startPos = nearestService ? nearestService.coords : (
      dispatchedAlert.type === "MEDICAL" ? { lat: 22.7300, lng: 75.8700 } : { lat: 22.6900, lng: 75.8300 }
    );
    // USE ACTUAL ALERT COORDS AS TARGET
    const targetPos = dispatchedAlert.coords || { lat: 22.7196, lng: 75.8577 };

    // 2. Fetch Shortest Path from OSRM
    const fetchPath = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${startPos.lng},${startPos.lat};${targetPos.lng},${targetPos.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.routes && data.routes[0]) {
          const coordinates = data.routes[0].geometry.coordinates; // [lng, lat]
          const totalDuration = data.routes[0].duration; // seconds
          setEta(totalDuration);

          // 3. Animation Loop (Synchronized with real-world time)
          let index = 0;
          // Calculate interval so that the entire path takes exactly totalDuration seconds
          const stepInterval = (totalDuration * 1000) / coordinates.length;
          
          const interval = setInterval(() => {
            if (index >= coordinates.length) {
              clearInterval(interval);
              setEta(0);
              setTruckPos([targetPos.lat, targetPos.lng]);
              updateDoc(doc(db, "alerts", dispatchedAlert.id), { status: "RESOLVED" })
                .catch(err => console.error("Auto-resolve failed:", err));
              return;
            }

            const [lng, lat] = coordinates[index];
            setTruckPos([lat, lng]);
            
            // Precise ETA countdown synced with progress
            setEta(totalDuration * (1 - (index / coordinates.length)));
            
            index++;
          }, stepInterval); 

          return () => clearInterval(interval);
        }
      } catch (err) {
        console.error("Routing error:", err);
        setTruckPos([startPos.lat, startPos.lng]);
      }
    };

    fetchPath();
  }, [alerts, services]);

  return (
    <div className="relative h-[500px] w-full rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 bg-black z-0">
      <MapContainer 
        center={hotelCenter} 
        zoom={14} 
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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

        {/* 5. DISPATCH UNIT TRACKING */}
        {truckPos && (
          <Marker 
            position={truckPos}
            icon={getCustomIcon(activeUnitType === "MEDICAL" ? "VEHICLE_MEDICAL" : "VEHICLE_FIRE")}
          />
        )}
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

      {eta !== null && (
        <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] px-8 py-4 border-2 rounded-[2rem] shadow-2xl flex items-center gap-6 text-white ${activeUnitType === "MEDICAL" ? "bg-blue-900/80 border-blue-500/50 shadow-blue-500/20" : "bg-red-900/80 border-red-500/50 shadow-red-500/20"} backdrop-blur-lg pointer-events-none`}>
          <div className="p-3 bg-white/10 rounded-2xl">
            {activeUnitType === "MEDICAL" ? <Activity size={24} className="animate-pulse" /> : <Truck size={24} className="animate-bounce" />}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Arriving In</p>
            <p className="text-2xl font-black tabular-nums">
              {eta > 60 ? `${Math.floor(eta / 60)}m ` : ""}{Math.round(eta % 60)}s
            </p>
          </div>
          <div className="w-2 h-10 border-r border-white/10" />
          <div className="text-right">
             <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Status</p>
             <p className="text-[10px] font-bold text-green-400 animate-pulse uppercase">En-Route</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapComponent;
