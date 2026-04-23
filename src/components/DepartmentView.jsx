import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Flame, ShieldAlert, Activity, AlertTriangle, Send, BellRing, Navigation, CheckCircle } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function DepartmentView() {
  const [confirmedAlerts, setConfirmedAlerts] = useState([]);

  useEffect(() => {
    // Listen only for CONFIRMED alerts (verified by hotel staff)
    const q = query(
      collection(db, "alerts"), 
      where("status", "==", "CONFIRMED")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => b.time?.toMillis() - a.time?.toMillis());
      setConfirmedAlerts(data);
    });

    return () => unsubscribe();
  }, []);

  const dispatchTeam = async (id) => {
    const alertRef = doc(db, "alerts", id);
    const promise = updateDoc(alertRef, { status: "EN-ROUTE" }); // Updated to EN-ROUTE
    toast.promise(promise, {
      loading: "Initializing Dispatch Sequence...",
      success: "UNITS EN-ROUTE. GPS Tracking Active.",
      error: "Dispatch Failed.",
    });
  };

  const requestVerification = async (alert) => {
    const promise = addDoc(collection(db, "enquiries"), {
      alertId: alert.id,
      hotelId: "MAIN-HOTEL",
      message: `PRIORITY ENQUIRY: Emergency Department requesting immediate verification for ${alert.type} incident at ${alert.location}`,
      time: serverTimestamp(),
      status: "PENDING"
    });
    
    toast.promise(promise, {
      loading: "Transmitting Enquiry...",
      success: "Enquiry Sent to Hotel Staff Desk.",
      error: "Transmission Failed.",
    });
  };

  const getIcon = (type) => {
    switch (type) {
      case 'FIRE': return <Flame className="text-red-500 animate-pulse" />;
      case 'MEDICAL': return <Activity className="text-blue-500 animate-pulse" />;
      case 'SECURITY': return <ShieldAlert className="text-orange-500 animate-pulse" />;
      default: return <AlertTriangle className="text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono flex flex-col relative overflow-hidden border-4 border-red-900/20">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* Background Grid Lines for "Monitor" look */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Header - Command Center Style */}
      <header className="px-8 py-4 border-b-2 border-red-900/50 bg-black/80 backdrop-blur-md relative z-10 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-widest text-white flex items-center gap-2">
              <ShieldAlert size={20} className="text-red-600" /> COMMAND CENTER <span className="text-red-600 font-normal">v4.0.2</span>
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">System Status: <span className="text-green-500 font-bold">NOMINAL</span></span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">Active Links: <span className="text-blue-500 font-bold">14</span></span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
           <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Current Time</p>
            <p className="text-xs font-bold text-white tabular-nums">{new Date().toLocaleTimeString()}</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/10 text-red-500 border border-red-500/30 rounded text-[10px] font-bold animate-pulse">
            LIVE FEED ACTIVE
          </div>
        </div>
      </header>

      {/* Main Content - Multi-Monitor Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar - Incident List */}
        <main className="w-1/3 border-r border-red-900/30 p-6 overflow-y-auto bg-black/20">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <h2 className="text-sm font-bold flex items-center gap-2 text-red-500 uppercase tracking-widest">
              <BellRing size={16} /> Pending Actions ({confirmedAlerts.length})
            </h2>
          </div>

          {confirmedAlerts.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle size={32} className="text-green-500/30 mx-auto mb-4" />
              <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em]">No Verified Incidents Reported</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {confirmedAlerts.map(alert => (
                <div key={alert.id} className="p-4 bg-red-950/20 border border-red-900/30 rounded-lg hover:bg-red-950/40 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black rounded border border-white/5">
                        {getIcon(alert.type)}
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white tracking-widest uppercase">{alert.type}</h3>
                        <p className="text-[9px] text-red-500 font-bold uppercase">Priority Level: 01</p>
                      </div>
                    </div>
                    <span className="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black">CONFIRMED</span>
                  </div>

                  <div className="space-y-1 mb-4">
                    <p className="text-[10px] text-slate-400 flex items-center gap-2">
                      <Navigation size={10} /> LOC: <span className="text-white font-bold">{alert.location}</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      TIME: <span className="text-slate-200 tabular-nums">{alert.time?.toDate ? alert.time.toDate().toLocaleTimeString() : 'RECENT'}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => dispatchTeam(alert.id)}
                      className="py-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black tracking-tighter rounded border border-red-400/50 shadow-lg shadow-red-900/20"
                    >
                      DISPATCH
                    </button>
                    <button 
                      onClick={() => requestVerification(alert)}
                      className="py-2 bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] font-bold rounded border border-white/10"
                    >
                      ENQUIRY
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right Section - Large Map / Data Monitor */}
        <div className="flex-1 flex flex-col bg-black">
          <div className="flex-1 relative">
             <div className="absolute inset-0 bg-red-600/5 pointer-events-none" />
             <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-black/80 border border-red-900/50 text-[9px] font-bold text-red-500 uppercase tracking-widest rounded flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
                SATELLITE DATA FEED - 75.8577° E
             </div>
             {/* Large Map Container */}
             <div className="w-full h-full opacity-80">
                <MapModule alerts={confirmedAlerts} showServices={true} />
             </div>
          </div>
          
          {/* Bottom Data Bar */}
          <div className="h-16 border-t border-red-900/30 bg-black/60 flex items-center px-8 gap-12 overflow-hidden whitespace-nowrap">
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase tracking-widest">Active Units</span>
              <span className="text-sm font-black text-white tracking-widest">04 <span className="text-[10px] font-normal text-slate-400">/ 12</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase tracking-widest">Network Latency</span>
              <span className="text-sm font-black text-green-500 tracking-widest">12ms</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase tracking-widest">Dispatch Queue</span>
              <span className="text-sm font-black text-red-500 tracking-widest">{confirmedAlerts.length}</span>
            </div>
            <div className="flex-1 flex items-center gap-4 opacity-30">
               <div className="h-px bg-white/20 flex-1" />
               <span className="text-[8px] tracking-[0.5em] uppercase">Security Level 04 Encrypted Link</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
