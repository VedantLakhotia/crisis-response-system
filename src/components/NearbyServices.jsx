import React, { useState, useEffect } from 'react';
import { Phone, MapPin, Navigation, X, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  findNearbyServices, 
  formatDistance, 
  getDirectionsUrl, 
  getCallUrl 
} from '../utils/nearbyServices.js';

/**
 * NearbyServices Component
 * Displays nearby fire stations and hospitals with contact and route information
 */
function NearbyServices({ 
  center = { lat: 22.7196, lng: 75.8577 }, 
  isOpen = false, 
  onClose = () => {},
  emergencyType = 'FIRE' 
}) {
  const [services, setServices] = useState({ fireStations: [], hospitals: [] });
  const [loading, setLoading] = useState(false);
  const emergencyKey = (emergencyType || "").toString().toUpperCase();
  const [selectedTab, setSelectedTab] = useState(emergencyKey === 'FIRE' ? 'fire' : 'hospital');

  useEffect(() => {
    if (isOpen) {
      loadNearbyServices();
    }
  }, [isOpen, center]);

  useEffect(() => {
    const key = (emergencyType || "").toString().toUpperCase();
    setSelectedTab(key === "FIRE" ? "fire" : "hospital");
  }, [emergencyType, isOpen]);

  const loadNearbyServices = async () => {
    setLoading(true);
    const result = await findNearbyServices(center, 5);
    setServices(result);
    setLoading(false);
  };

  const ServiceCard = ({ service, isFireStation = false }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-4 mb-3 hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg ${isFireStation ? 'bg-orange-100' : 'bg-red-100'}`}>
            <AlertCircle className={`w-5 h-5 ${isFireStation ? 'text-orange-600' : 'text-red-600'}`} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{service.name}</h3>
            <p className="text-xs text-gray-600 mt-1">{service.address}</p>
          </div>
        </div>
      </div>

      {/* Distance and Time */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="font-semibold">{formatDistance(service.distance)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Clock className="w-4 h-4 text-green-600" />
          <span className="font-semibold">
            {isFireStation ? service.responseTime : service.emergency}
          </span>
        </div>
      </div>

      {/* Additional Info */}
      {!isFireStation && (
        <div className="text-xs text-gray-600 mb-3">
          <span className="inline-block bg-blue-100 text-blue-900 px-2 py-1 rounded mr-2 mb-1">
            {service.beds} Beds
          </span>
          {service.services && service.services.map((s, idx) => (
            <span key={idx} className="inline-block bg-green-100 text-green-900 px-2 py-1 rounded mr-2 mb-1">
              {s}
            </span>
          ))}
        </div>
      )}

      {isFireStation && service.availability && (
        <div className="text-xs mb-3">
          <span className="inline-block bg-green-100 text-green-900 px-2 py-1 rounded">
            ✓ {service.availability}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => window.open(getCallUrl(service.contact), '_blank')}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition font-semibold"
          title={`Call ${service.name}`}
        >
          <Phone className="w-4 h-4" />
          Call
        </button>
        <button
          onClick={() => window.open(getDirectionsUrl(center, service.coords, service.name), '_blank')}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition font-semibold"
          title={`Navigate to ${service.name}`}
        >
          <Navigation className="w-4 h-4" />
          Route
        </button>
      </div>

      {/* Contact Display */}
      <div className="mt-3 pt-3 border-t border-gray-300 text-xs text-gray-600">
        <span className="font-semibold">Contact: </span>
        <a href={getCallUrl(service.contact)} className="text-blue-600 hover:underline">
          {service.contact}
        </a>
      </div>
    </motion.div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center"
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="bg-white w-full md:w-2xl md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Nearby Emergency Services</h2>
              <p className="text-orange-100 text-sm mt-1">Within 5 km radius • One-click routing & calling</p>
            </div>
            <button
              onClick={onClose}
              className="hover:bg-red-700 p-2 rounded-full transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 sticky top-[72px] bg-white z-40">
            <button
              onClick={() => setSelectedTab('fire')}
              className={`flex-1 py-3 font-semibold transition ${
                selectedTab === 'fire'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🚒 Fire Stations ({services.fireStations.length})
            </button>
            <button
              onClick={() => setSelectedTab('hospital')}
              className={`flex-1 py-3 font-semibold transition ${
                selectedTab === 'hospital'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏥 Hospitals ({services.hospitals.length})
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              </div>
            ) : (
              <>
                {/* Fire Stations Tab */}
                <AnimatePresence mode="wait">
                  {selectedTab === 'fire' && (
                    <motion.div
                      key="fire"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {services.fireStations.length > 0 ? (
                        services.fireStations.map(station => (
                          <ServiceCard key={station.id} service={station} isFireStation={true} />
                        ))
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No fire stations found in the area</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Hospitals Tab */}
                  {selectedTab === 'hospital' && (
                    <motion.div
                      key="hospital"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {services.hospitals.length > 0 ? (
                        services.hospitals.map(hospital => (
                          <ServiceCard key={hospital.id} service={hospital} isFireStation={false} />
                        ))
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No hospitals found in the area</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* Footer Info */}
          <div className="border-t border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-blue-600" />
              <p>
                Services are updated in real-time. Contact times are estimates. Emergency: Always call 112 for immediate assistance.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default NearbyServices;
