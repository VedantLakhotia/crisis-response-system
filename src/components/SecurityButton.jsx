import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import { ShieldAlert } from "lucide-react";
import { EmergencyModal } from "./EmergencyModal";
import { soundManager } from "../utils/alertSound";
import { notificationManager } from "../utils/webNotifications";
import { socket } from "../utils/websocketSimulator";
import { crisisLog } from "../utils/crisisLog";

export function SecurityButton({ onSecurityActivated }) {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toastRef = useRef(null);

  const handleSecurityClick = async () => {
    // Step 1: Play alert sound immediately
    soundManager.playHighPriorityBeep();
    
    // Step 2: Show high-priority toast
    if (toastRef.current) {
      toast.dismiss(toastRef.current);
    }

    toastRef.current = toast.custom(
      (t) => (
        <div
          className={`bg-orange-600 text-white p-4 rounded-lg shadow-2xl border-4 border-orange-700 animate-pulse max-w-sm ${
            t.visible ? "animate-in fade-in slide-in-from-top" : "animate-out fade-out"
          }`}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 animate-bounce" />
            <div>
              <p className="font-bold text-lg">🛡️ ACTIVE EMERGENCY</p>
              <p className="text-sm text-orange-100">SECURITY ALERT INITIATED</p>
              <p className="text-xs text-orange-200 mt-1">
                Filling in emergency details...
              </p>
            </div>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: "top-center",
      }
    );

    // Step 3: Request Web Notification permission and show desktop alert
    await notificationManager.sendEmergencyNotification(
      "SECURITY",
      "Pending location confirmation",
      "URGENT"
    );

    // Step 4: Open emergency details modal
    setShowModal(true);
  };

  const handleModalSubmit = async (details) => {
    setIsSubmitting(true);

    try {
      // Play emergency tone while processing
      await soundManager.playEmergencyTone();

      // Create crisis log entry
      const logEntry = crisisLog.add("SECURITY", details.location, details.severity, {
        responders: 0,
        timestamp: new Date().toISOString()
      });

      // Trigger WebSocket broadcast
      await socket.emit("emergency_security", {
        type: "SECURITY",
        location: details.location,
        severity: details.severity,
        timestamp: new Date().toISOString(),
        id: logEntry.id
      });

      // Dismiss previous toast
      if (toastRef.current) {
        toast.dismiss(toastRef.current);
      }

      // Show success notification
      toast.success(
        () => (
          <div>
            <p className="font-bold">🛡️ Security Emergency Initiated</p>
            <p className="text-sm">
              Level {details.severity} | {details.location}
            </p>
            <p className="text-xs text-green-900 mt-2">
              Broadcast to staff dashboards ✓
            </p>
          </div>
        ),
        {
          duration: 5000,
          position: "top-center",
          style: {
            background: "#22c55e",
            color: "#fff"
          }
        }
      );

      // Play confirmation sound
      soundManager.playConfirmation();

      // Notify parent component
      if (onSecurityActivated) {
        onSecurityActivated({
          type: "SECURITY",
          location: details.location,
          severity: details.severity,
          logEntry
        });
      }

      // Dispatch custom event for crisis log update
      window.dispatchEvent(new Event("crisisLogUpdated"));

      setShowModal(false);
    } catch (error) {
      console.error("Error processing security emergency:", error);
      toast.error("Error processing emergency. Please try again.", {
        position: "top-center"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleSecurityClick}
        className="relative bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center gap-2 group overflow-hidden"
        aria-label="Initiate security emergency"
        title="Click to initiate security emergency (opens details modal)"
      >
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-orange-700 opacity-0 group-hover:opacity-30 transition-opacity" />

        {/* Icon with animation */}
        <ShieldAlert className="w-6 h-6 animate-pulse group-hover:animate-bounce" />

        {/* Text */}
        <span className="relative z-10">SECURITY</span>
      </button>

      {/* Emergency Modal */}
      <EmergencyModal
        isOpen={showModal}
        emergencyType="Security"
        onSubmit={handleModalSubmit}
        onClose={() => setShowModal(false)}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
