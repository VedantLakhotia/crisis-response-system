import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { motion } from 'framer-motion';

const MAP_ID = 'bf50a9291fa2784d'; // Dark Mode Map ID

// --- MAIN ENHANCED MAP COMPONENT ---
function MapComponent({ alerts = [], staff = [] }) {
  const hotelCenter = { lat: 22.7196, lng: 75.8577 };
  // Best practice: Store API keys securely in an environment variable (.env file)
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAq9afG542PH6dlxtnm3-dJS5-hozfW53Q';

  return (
    <APIProvider apiKey={API_KEY}>
      <div className="relative h-[500px] w-full rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5">
        <Map
          defaultCenter={hotelCenter}
          defaultZoom={14}
          disableDefaultUI={true}
          mapId={MAP_ID}
          className="w-full h-full"
        >
          {/* 1. EXISTING ALERTS & STAFF */}
          {alerts.map((alert) => (
            alert.coords && (
              <Marker 
                key={alert.id} 
                position={alert.coords} 
                label={{ text: '🔥', className: 'text-2xl mt-[-40px]' }} 
              />
            )
          ))}
          
          {staff.map((member) => (
            member.coords && (
              <Marker 
                key={member.id} 
                position={member.coords} 
                label={{ text: '👮', className: 'text-2xl mt-[-40px]' }} 
              />
            )
          ))}
        </Map>

        {/* Static Overlay */}
        <div className="absolute top-6 left-6 z-10 px-4 py-2 glass rounded-xl text-[10px] font-bold text-slate-400 border border-white/5 flex items-center gap-2">
          Live Coordination Map Active
        </div>
      </div>
    </APIProvider>
  );
}

export default MapComponent;
