import React, { useEffect, useRef } from "react";

export function EmergencyFlashOverlay({ isActive, duration = 3000 }) {
  const [showFlash, setShowFlash] = React.useState(false);
  const flashIntervalRef = useRef(null);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isActive) {
      setShowFlash(false);
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
      }
      return;
    }

    setShowFlash(true);
    const startTime = Date.now();
    
    flashIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed > duration) {
        setShowFlash(false);
        if (flashIntervalRef.current) {
          clearInterval(flashIntervalRef.current);
        }
      } else {
        setShowFlash(prev => !prev);
      }
    }, 200); // Flash every 200ms

    return () => {
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
      }
    };
  }, [isActive, duration]);

  if (!showFlash) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        border: "15px solid #dc2626",
        boxSizing: "border-box",
        animation: "pulse 0.2s infinite",
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: inset 0 0 50px rgba(220, 38, 38, 0.8), 0 0 50px rgba(220, 38, 38, 0.8);
          }
          50% {
            box-shadow: inset 0 0 30px rgba(220, 38, 38, 0.4), 0 0 30px rgba(220, 38, 38, 0.4);
          }
        }
      `}</style>
    </div>
  );
}
