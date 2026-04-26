import { createContext, useContext, useState, useEffect } from "react";
import { Building2, ArrowRight, ChevronDown } from "lucide-react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

const HotelContext = createContext(null);

const STORAGE_KEY = "crisis_hotel_config";

function generateID(name) {
  const slug = name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 6).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HOTEL-${slug}-${rand}`;
}

function generateOrgID(name) {
  const slug = name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 6).toUpperCase();
  return `ORG-${slug}-${new Date().getFullYear()}`;
}

function loadHotel() {
  try {
    // If URL has hotelID (guest/department link), bypass onboarding
    const params = new URLSearchParams(window.location.search);
    const urlHotelID = params.get("hotelID");
    if (urlHotelID) {
      return {
        hotelName: "Guest Portal",
        hotelID: urlHotelID,
        orgID: "GUEST-ACCESS"
      };
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

function saveHotel(hotel) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hotel));
}

// ============ ONBOARDING SCREEN ============
function HotelOnboarding({ onComplete }) {
  const [selectedHotelJSON, setSelectedHotelJSON] = useState("");
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const q = query(collection(db, "hotels"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const fetchedHotels = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setHotels(fetchedHotels);
      } catch (err) {
        console.error("Error fetching hotels:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHotels();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedHotelJSON) return;
    
    let selectedHotel;
    try {
      selectedHotel = JSON.parse(selectedHotelJSON);
    } catch (err) {
      return;
    }

    const hotel = {
      hotelName: selectedHotel.name,
      hotelID: selectedHotel.hotelID || generateID(selectedHotel.name),
      orgID: selectedHotel.orgID || generateOrgID(selectedHotel.name),
    };
    saveHotel(hotel);
    onComplete(hotel);
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center font-sans">
      <div className="w-[460px] rounded-3xl border border-white/10 overflow-hidden animate-scaleIn"
        style={{ background: "linear-gradient(160deg, #14161e 0%, #0d0f15 100%)" }}>
        
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
            <Building2 size={28} className="text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Welcome to Crisis Control</h1>
          <p className="text-sm text-slate-500">Set up your hotel to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 flex flex-col gap-5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Select Registered Hotel
            </label>
            <div className="relative">
              <select
                value={selectedHotelJSON}
                onChange={e => setSelectedHotelJSON(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all appearance-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <option value="" disabled className="text-slate-500 bg-[#14161e]">
                  {loading ? "Loading hotels..." : "-- Choose a hotel --"}
                </option>
                {hotels.map(h => (
                  <option key={h.id} value={JSON.stringify(h)} className="text-white bg-[#14161e]">{h.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <ChevronDown size={16} className="text-slate-400" />
              </div>
            </div>
          </div>

          {selectedHotelJSON && (() => {
            try {
              const h = JSON.parse(selectedHotelJSON);
              return (
                <div className="rounded-xl p-4 border border-white/5 animate-fadeIn" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest mb-2">Selected Property</p>
                  <p className="text-sm font-bold text-white">{h.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">
                    ID: {h.hotelID || generateID(h.name)}
                  </p>
                </div>
              );
            } catch (err) { return null; }
          })()}

          <button
            type="submit"
            disabled={!selectedHotelJSON}
            className="w-full py-3.5 rounded-xl text-white text-sm font-bold tracking-wide transition-all btn-click-effect disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: selectedHotelJSON ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "#1e1e2e",
              boxShadow: selectedHotelJSON ? "0 4px 20px rgba(99,102,241,0.3)" : "none",
            }}
          >
            <span className="flex items-center justify-center gap-2">
              Launch Dashboard <ArrowRight size={16} />
            </span>
          </button>

          <p className="text-center text-[10px] text-slate-700 mt-1">
            🔒 This can be changed later from the Admin Console
          </p>
        </form>
      </div>
    </div>
  );
}

// ============ PROVIDER ============
export function HotelProvider({ children }) {
  const [hotel, setHotel] = useState(loadHotel);

  const updateHotel = (newHotel) => {
    setHotel(newHotel);
    saveHotel(newHotel);
  };

  if (!hotel) {
    return <HotelOnboarding onComplete={updateHotel} />;
  }

  return (
    <HotelContext.Provider value={{ ...hotel, updateHotel }}>
      {children}
    </HotelContext.Provider>
  );
}

export function useHotel() {
  const ctx = useContext(HotelContext);
  if (!ctx) throw new Error("useHotel must be used within a HotelProvider");
  return ctx;
}

export default HotelContext;
