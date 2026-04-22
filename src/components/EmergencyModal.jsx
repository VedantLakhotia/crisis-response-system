import React, { useState } from "react";
import { AlertTriangle, MapPin, X } from "lucide-react";

export function EmergencyModal({
  isOpen,
  emergencyType,
  onSubmit,
  onClose,
  isSubmitting = false
}) {
  const [severity, setSeverity] = useState(3);
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!location.trim()) {
      newErrors.location = "Location/Floor Number is required";
    }

    if (severity < 1 || severity > 5) {
      newErrors.severity = "Severity must be between 1-5";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      severity: parseInt(severity),
      location: location.trim()
    });

    // Reset form
    setSeverity(3);
    setLocation("");
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full animate-in fade-in zoom-in">
        {/* Header */}
        <div className="bg-red-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-xl font-bold">{emergencyType} Emergency Details</h2>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-red-700 p-1 rounded transition"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Severity Level */}
          <div>
            <label
              htmlFor="severity"
              className="block text-sm font-bold text-gray-900 mb-2"
            >
              Severity Level (1-5)
            </label>
            <div className="flex items-center gap-4">
              <input
                id="severity"
                type="range"
                min="1"
                max="5"
                value={severity}
                onChange={(e) => {
                  setSeverity(e.target.value);
                  setErrors({ ...errors, severity: "" });
                }}
                className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-red-600"
                aria-label="Emergency severity level"
              />
              <span
                className={`text-3xl font-bold w-12 text-center ${
                  severity >= 4
                    ? "text-red-600"
                    : severity >= 3
                    ? "text-orange-600"
                    : "text-yellow-600"
                }`}
              >
                {severity}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {severity === 1 && "Minor - Low priority"}
              {severity === 2 && "Moderate - Standard response"}
              {severity === 3 && "High - Urgent response needed"}
              {severity === 4 && "Critical - Immediate response required"}
              {severity === 5 && "Catastrophic - All units respond"}
            </div>
            {errors.severity && (
              <p className="text-red-600 text-sm mt-1">{errors.severity}</p>
            )}
          </div>

          {/* Location/Floor Number */}
          <div>
            <label
              htmlFor="location"
              className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-red-600" />
              Location / Floor Number
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setErrors({ ...errors, location: "" });
              }}
              placeholder="e.g., Zone A, 3rd Floor, Room 301"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600 transition"
              aria-label="Emergency location or floor number"
            />
            {errors.location && (
              <p className="text-red-600 text-sm mt-1">{errors.location}</p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
            <p className="text-sm text-blue-900">
              <strong>ℹ️ This information will be:</strong>
              <ul className="list-disc list-inside mt-2 ml-2">
                <li>Broadcast to all staff dashboards</li>
                <li>Added to the Crisis Log</li>
                <li>Sent to first responders</li>
              </ul>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-bold rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
              disabled={isSubmitting}
              aria-label="Cancel emergency"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
              aria-label="Submit emergency details"
            >
              {isSubmitting ? "Sending..." : "Broadcast Emergency"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
