import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle, MapPin, Flame } from "lucide-react";
import { crisisLog } from "../utils/crisisLog";

export function CrisisLogDisplay() {
  const [logs, setLogs] = useState(() => crisisLog.getAll());

  useEffect(() => {
    // Set up listener for log updates
    const handleStorageChange = () => {
      const updatedLogs = crisisLog.getAll();
      setLogs(updatedLogs);
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom events
    window.addEventListener("crisisLogUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("crisisLogUpdated", handleStorageChange);
    };
  }, []);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 1:
        return "bg-yellow-100 text-yellow-800";
      case 2:
        return "bg-orange-100 text-orange-800";
      case 3:
      case 4:
        return "bg-red-100 text-red-800";
      case 5:
        return "bg-red-900 text-red-100";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEmergencyIcon = (type) => {
    switch (type) {
      case "FIRE":
        return <Flame className="w-5 h-5" />;
      case "MEDICAL":
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 my-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-red-600" />
        Crisis Log
      </h3>

      {logs.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No emergency events recorded.</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`p-3 rounded-lg border-l-4 border-red-600 ${getSeverityColor(
                log.severity
              )} bg-opacity-20 backdrop-blur-sm`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-red-600 mt-1">
                    {getEmergencyIcon(log.type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">
                      {log.timeStr} - {log.type} EMERGENCY
                    </div>
                    <div className="text-xs mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {log.location}
                    </div>
                    <div className="text-xs mt-1">
                      Severity: <span className="font-bold">{log.severity}/5</span>
                    </div>
                    {log.responders && (
                      <div className="text-xs mt-1 text-gray-600">
                        Responders: {log.responders}
                      </div>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-bold rounded whitespace-nowrap ${
                    log.status === "Active"
                      ? "bg-red-600 text-white animate-pulse"
                      : "bg-green-600 text-white"
                  }`}
                >
                  {log.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
