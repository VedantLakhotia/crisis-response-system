import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";

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
    <div style={{ padding: "20px", backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      <h2>Security Control Center</h2>
      {alerts.map((alert) => (
        <div key={alert.id} style={{ 
          backgroundColor: "white", padding: "15px", marginBottom: "10px", 
          borderRadius: "10px", borderLeft: "10px solid red", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" 
        }}>
          <strong>{alert.type} EMERGENCY</strong>
          <p>Location: {alert.location} | Status: {alert.status}</p>
        </div>
      ))}
    </div>
  );
}

export default Dashboard;