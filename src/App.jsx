import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore";
import { Flame, Activity, ShieldAlert, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import MapModule from "./MapComponent"; // Ensure this filename matches your sidebar

function App() {
  const [alerts, setAlerts] = useState([]);
  const [staff, setStaff] = useState([]); // Correct state name

  // --- 1. LISTENING FOR ALERTS ---
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("time", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter out resolved alerts so the feed stays clean
      setAlerts(data.filter(a => a.status !== "Resolved"));
    });
    return () => unsubscribe();
  }, []);

  // --- 2. LISTENING FOR STAFF ---
  useEffect(() => {
    const q = query(collection(db, "staff"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaff(data);
    });
    return () => unsubscribe();
  }, []);

  // --- 3. SENDING ALERTS (With Coordinates) ---
  const sendAlert = async (type) => {
    // Coordinates for Indore / IIPS Campus area
    const locations = {
      FIRE: { lat: 22.7125, lng: 75.8762 },
      MEDICAL: { lat: 22.7150, lng: 75.8700 },
      SECURITY: { lat: 22.7100, lng: 75.8800 },
      OTHER: { lat: 22.7180, lng: 75.8750 }
    };

    try {
      await addDoc(collection(db, "alerts"), {
        type: type,
        status: "Pending",
        location: "Zone " + (Math.floor(Math.random() * 10) + 1),
        coords: locations[type], 
        time: serverTimestamp(),
      });
    } catch (e) {
      console.error("Firebase Error:", e);
      alert("Error sending alert");
    }
  };

  // --- 4. RESOLVE LOGIC ---
  const resolveAlert = async (id) => {
    try {
      const alertRef = doc(db, "alerts", id);
      await updateDoc(alertRef, { status: "Resolved" });
    } catch (e) {
      console.error("Resolve Error:", e);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "sans-serif", backgroundColor: "#111" }}>
      
      {/* HEADER & BUTTONS */}
      <div style={{ padding: "30px 20px", textAlign: "center", borderBottom: "2px solid #333" }}>
        <h1 style={{ color: "white", marginBottom: "20px" }}>Hospitality Crisis Control</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", maxWidth: "500px", margin: "0 auto" }}>
          <button onClick={() => sendAlert("FIRE")} style={btnStyle("#e11d48")}><Flame /> FIRE</button>
          <button onClick={() => sendAlert("MEDICAL")} style={btnStyle("#2563eb")}><Activity /> MEDICAL</button>
          <button onClick={() => sendAlert("SECURITY")} style={btnStyle("#ea580c")}><ShieldAlert /> SECURITY</button>
          <button onClick={() => sendAlert("OTHER")} style={btnStyle("#4b5563")}><AlertTriangle /> OTHER</button>
        </div>
      </div>

      {/* MAP SECTION */}
      <div style={{ padding: "20px", backgroundColor: "#1a1a1a" }}>
        <h3 style={{ color: "#aaa", marginBottom: "10px", textAlign: "center" }}>Real-Time Coordination Map</h3>
        <MapModule alerts={alerts} staff={staff} />
      </div>

      {/* LIVE FEED SECTION */}
      <div style={{ flex: 1, backgroundColor: "#f3f4f6", padding: "20px" }}>
        <h2 style={{ color: "#333", display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <Clock /> Active Incidents
        </h2>
        
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          {alerts.length === 0 && <p style={{ textAlign: "center", color: "#666" }}>All clear. No active emergencies.</p>}
          
          {alerts.map((alert) => (
            <div key={alert.id} style={alertCard(alert.type)}>
              <div>
                <strong style={{ fontSize: "18px" }}>{alert.type} DETECTED</strong>
                <p style={{ margin: "5px 0", color: "#444" }}>Location: {alert.location} | Status: <span style={{ color: "#e11d48", fontWeight: "bold" }}>{alert.status}</span></p>
              </div>
              <button onClick={() => resolveAlert(alert.id)} style={resolveBtn}>
                <CheckCircle size={18} /> Resolve
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- STYLING HELPERS ---
const btnStyle = (color) => ({
  backgroundColor: color, color: "white", padding: "25px 10px", fontSize: "16px",
  fontWeight: "bold", borderRadius: "12px", border: "none", cursor: "pointer",
  display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
  transition: "opacity 0.2s"
});

const alertCard = (type) => ({
  backgroundColor: "white", padding: "20px", marginBottom: "12px", 
  borderRadius: "12px", borderLeft: "10px solid " + (type === 'FIRE' ? '#e11d48' : '#2563eb'),
  boxShadow: "0 4px 6px rgba(0,0,0,0.05)", display: "flex", 
  justifyContent: "space-between", alignItems: "center"
});

const resolveBtn = {
  backgroundColor: "#10b981", color: "white", border: "none", padding: "10px 16px",
  borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", 
  gap: "6px", fontWeight: "bold"
};

export default App;