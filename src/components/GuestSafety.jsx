import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, where } from "firebase/firestore";
import { ShieldAlert, AlertTriangle, MessageSquare, CheckCircle } from "lucide-react";
import { toast, Toaster } from "sonner";

import { useHotel } from "../context/HotelContext";

export default function GuestSafety() {
  const { hotelID } = useHotel();
  const [searchParams] = useSearchParams();
  const room = searchParams.get("room") || "302";
  
  const [isSafe, setIsSafe] = useState(true);
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Listen to instructions pushed from Staff Dashboard
  useEffect(() => {
    const q = query(
      collection(db, "instructions"), 
      where("hotelID", "==", hotelID),
      orderBy("time", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInstructions(data);
    });
    return () => unsubscribe();
  }, []);

  const handleSOS = async () => {
    setLoading(true);
    setIsSafe(false);

    const submitSOS = async (coords = null) => {
      try {
        await addDoc(collection(db, "alerts"), {
          type: "MEDICAL", 
          status: "CONFIRMED", 
          location: coords ? `Auto-Detected (Room ${room})` : `Room ${room}`,
          coords: coords || { lat: 22.7196, lng: 75.8577 }, 
          triggeredBy: `GUEST (${room})`,
          hotelID,
          time: serverTimestamp(),
        });
        toast.error("EMERGENCY ALERT SENT", { 
          description: coords ? "Location detected! Help is on the way." : "SOS sent from your room. Help is on the way.",
          style: { background: '#ef4444', color: '#fff', border: 'none' }
        });
      } catch (err) {
        toast.error("Failed to send SOS.", { description: err.message });
      } finally {
        setLoading(false);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          submitSOS({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => {
          console.error("GPS Error:", error);
          submitSOS(); // Fallback to room defaults
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      submitSOS();
    }
  };

  return (
    <div className="min-h-screen bg-[#fffbeb] text-slate-900 flex flex-col font-sans">
      <Toaster position="top-center" theme="light" richColors />
      
      {/* High Visibility Warning Header */}
      <header className="p-6 bg-yellow-400 border-b-4 border-yellow-600 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg animate-pulse">
            <ShieldAlert className="text-white" size={28} />
          </div>
          <div>
            <h1 className="font-black text-xl uppercase tracking-tighter text-red-700">Guest Safety Portal</h1>
            <p className="text-xs font-bold text-red-800/60 uppercase">Emergency Protocol Active · Room {room}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 max-w-md mx-auto w-full">
        
        {/* Massive SOS Button Section */}
        <section className="flex flex-col items-center justify-center py-8 bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(234,179,8,0.3)] border-2 border-yellow-200">
          <button 
            onClick={handleSOS}
            disabled={loading}
            className="w-56 h-56 rounded-full flex flex-col items-center justify-center gap-2 shadow-[0_15px_60px_rgba(220,38,38,0.5)] transition-all active:scale-90 disabled:opacity-50 relative group"
            style={{
              background: "linear-gradient(145deg, #dc2626, #991b1b)",
            }}
          >
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20 group-active:hidden" />
            {loading ? (
               <svg className="animate-spin w-16 h-16 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <>
                <AlertTriangle size={64} className="text-white drop-shadow-lg" />
                <span className="font-black text-4xl tracking-tighter text-white drop-shadow-lg">SOS</span>
                <span className="text-[10px] font-bold text-red-200 uppercase tracking-widest">Tap for Help</span>
              </>
            )}
          </button>
          <p className="text-center text-sm font-bold text-red-600 mt-8 px-6 uppercase tracking-tight">
            Pressing this button will dispatch emergency services to Room {room} immediately.
          </p>
        </section>

        {/* Status Toggle - High Contrast */}
        <section className="bg-slate-900 p-2 rounded-3xl flex relative shadow-2xl">
          <button
            onClick={() => setIsSafe(true)}
            className={`flex-1 py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${isSafe ? 'bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'text-slate-500'}`}
          >
            <CheckCircle size={20} />
            I AM SAFE
          </button>
          <button
            onClick={() => setIsSafe(false)}
            className={`flex-1 py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${!isSafe ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'text-slate-500'}`}
          >
            <AlertTriangle size={20} />
            I NEED HELP
          </button>
        </section>

        {/* Instructions Feed - Professional Alert Style */}
        <section className="flex-1 flex flex-col gap-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
            <MessageSquare size={16} className="text-red-500" /> Emergency Instructions
          </h2>
          <div className="flex-1 bg-white rounded-[2rem] p-6 shadow-xl border-2 border-slate-100 overflow-y-auto max-h-64 flex flex-col gap-4">
            {instructions.length === 0 ? (
               <div className="flex flex-col items-center justify-center text-slate-300 py-6 text-center">
                 <ShieldAlert size={40} className="mb-2 opacity-20" />
                 <p className="text-sm font-bold uppercase tracking-tighter">Waiting for staff instructions...</p>
               </div>
            ) : (
              instructions.map(inst => (
                <div key={inst.id} className="p-5 rounded-2xl bg-yellow-50 border-l-4 border-yellow-500 flex flex-col gap-3 shadow-sm">
                  <p className="text-base font-bold text-slate-800 leading-tight">{inst.text}</p>
                  <div className="flex justify-between items-center border-t border-yellow-200 pt-2">
                    <span className="text-[9px] text-yellow-700 font-black uppercase tracking-widest">
                      Broadcasted: {inst.time?.toDate ? inst.time.toDate().toLocaleTimeString() : 'Just now'}
                    </span>
                    <span className="text-[9px] bg-yellow-500 text-white px-2 py-0.5 rounded-full font-bold">OFFICIAL</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </main>
      
      {/* Footer Safety Strip */}
      <footer className="p-4 bg-red-700 text-white text-center text-[10px] font-black uppercase tracking-[0.3em]">
        Stay calm · Do not use elevators · Follow instructions
      </footer>
    </div>
  );
}
