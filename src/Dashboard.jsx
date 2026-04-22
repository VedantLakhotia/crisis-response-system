import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { ShieldAlert, Clock, AlertCircle } from "lucide-react";

function Dashboard() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("time", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAlerts(data);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="p-10 bg-[#0a0a0c] min-h-screen text-slate-200 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3 text-white">
              <ShieldAlert className="text-red-500" size={32} /> Security Control Center
            </h2>
            <p className="text-slate-500 mt-2">Historical incident log and real-time monitoring</p>
          </div>
          <div className="h-12 w-12 rounded-full border-2 border-red-500 animate-ping absolute opacity-20" />
        </header>

        <div className="grid gap-4">
          {alerts.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center opacity-50">
              <AlertCircle className="mx-auto mb-4" size={48} />
              <p>No incidents recorded in the current session.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className={`glass p-6 rounded-2xl border-l-8 ${alert.status === 'Resolved' ? 'border-green-500/50' : 'border-red-500'} flex justify-between items-center shadow-lg`}>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <strong className="text-lg text-white uppercase tracking-tight">{alert.type} EMERGENCY</strong>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${alert.status === 'Resolved' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">Location: {alert.location} | Zone: Alpha-{(alert.id.charCodeAt(0) % 5) + 1}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2 text-slate-500">
                  <Clock size={16} />
                  <span className="text-xs">
                    {alert.time?.toDate ? alert.time.toDate().toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;