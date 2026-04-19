import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy } from "firebase/firestore";
import { Flame, Activity, ShieldAlert, AlertTriangle, Clock } from "lucide-react";

function App() {
  const [alerts, setAlerts] = useState([]);

  // --- DATABASE LOGIC (Listening for alerts) ---
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("time", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAlerts(data);
    });
    return () => unsubscribe();
  }, []);

  // --- BUTTON LOGIC (Sending alerts) ---
  const sendAlert = async (type) => {
    try {
      await addDoc(collection(db, "alerts"), {
        type: type,
        status: "Pending",
        location: "Room " + (Math.floor(Math.random() * 500) + 100), // Random room for demo
        time: serverTimestamp(),
      });
    } catch (e) {
      alert("Error sending alert");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "sans-serif", backgroundColor: "#111" }}>
      
      {/* SECTION 1: THE REPORTER (GUEST SIDE) */}
      <div style={{ padding: "40px 20px", textAlign: "center", borderBottom: "2px solid #333" }}>
        <h1 style={{ color: "white" }}>Hospitality Crisis App</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", maxWidth: "500px", margin: "20px auto" }}>
          <button onClick={() => sendAlert("FIRE")} style={btn("#e11d48")}><Flame /> FIRE</button>
          <button onClick={() => sendAlert("MEDICAL")} style={btn("#2563eb")}><Activity /> MEDICAL</button>
          <button onClick={() => sendAlert("SECURITY")} style={btn("#ea580c")}><ShieldAlert /> SECURITY</button>
          <button onClick={() => sendAlert("OTHER")} style={btn("#4b5563")}><AlertTriangle /> OTHER</button>
        </div>
      </div>

      {/* SECTION 2: THE DASHBOARD (SECURITY SIDE) */}
      <div style={{ flex: 1, backgroundColor: "#f3f4f6", padding: "20px" }}>
        <h2 style={{ color: "#333", display: "flex", alignItems: "center", gap: "10px" }}><Clock /> Live Incident Feed</h2>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          {alerts.length === 0 && <p>No active incidents.</p>}
          {alerts.map((alert) => (
            <div key={alert.id} style={{ 
              backgroundColor: "white", padding: "15px", marginBottom: "10px", 
              borderRadius: "10px", borderLeft: "8px solid " + (alert.type === 'FIRE' ? 'red' : 'blue'),
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)" 
            }}>
              <strong style={{ fontSize: "18px" }}>{alert.type} REPORTED</strong>
              <p style={{ margin: "5px 0", color: "#666" }}>Location: {alert.location} | Status: <span style={{ color: "red", fontWeight: "bold" }}>{alert.status}</span></p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// Simple styling helper
const btn = (color) => ({
  backgroundColor: color, color: "white", padding: "30px 10px", fontSize: "16px",
  fontWeight: "bold", borderRadius: "12px", border: "none", cursor: "pointer",
  display: "flex", flexDirection: "column", alignItems: "center", gap: "10px"
});

export default App;