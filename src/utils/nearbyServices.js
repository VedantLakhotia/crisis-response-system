/**
 * Nearby Emergency Services Utility
 * Finds and retrieves information for nearby fire stations and hospitals
 */

// Mock data for fire stations and hospitals (Indore, India)
const MOCK_SERVICES = {
  fireStations: [
    {
      id: 'fs-1',
      name: 'Indore Main Fire Station',
      type: 'Fire Station',
      coords: { lat: 22.7196, lng: 75.8577 },
      address: 'Station Road, Indore',
      contact: '+91-731-2553333',
      distance: 0.5,
      responseTime: '5-10 min',
      availability: 'Available'
    },
    {
      id: 'fs-2',
      name: 'Khajrana Fire Station',
      type: 'Fire Station',
      coords: { lat: 22.7396, lng: 75.8677 },
      address: 'Khajrana, Indore',
      contact: '+91-731-2554444',
      distance: 2.1,
      responseTime: '10-15 min',
      availability: 'Available'
    },
    {
      id: 'fs-3',
      name: 'Rau Fire Station',
      type: 'Fire Station',
      coords: { lat: 22.6896, lng: 75.8277 },
      address: 'Rau, Indore',
      contact: '+91-731-2555555',
      distance: 3.2,
      responseTime: '15-20 min',
      availability: 'Available'
    }
  ],
  hospitals: [
    {
      id: 'h-1',
      name: 'Medanta Hospital',
      type: 'Hospital',
      coords: { lat: 22.7246, lng: 75.8627 },
      address: 'Scheme 114, Indore',
      contact: '+91-731-4001000',
      distance: 1.2,
      emergency: '24/7',
      beds: 250,
      services: ['ICU', 'Trauma', 'Emergency']
    },
    {
      id: 'h-2',
      name: 'Apollo Hospital',
      type: 'Hospital',
      coords: { lat: 22.7346, lng: 75.8527 },
      address: 'Vijay Nagar, Indore',
      contact: '+91-731-3100100',
      distance: 2.5,
      emergency: '24/7',
      beds: 300,
      services: ['ICU', 'Cardiac', 'Emergency']
    },
    {
      id: 'h-3',
      name: 'Choithram Hospital',
      type: 'Hospital',
      coords: { lat: 22.6996, lng: 75.8377 },
      address: 'South Tukoganj, Indore',
      contact: '+91-731-2530000',
      distance: 3.8,
      emergency: '24/7',
      beds: 350,
      services: ['ICU', 'Surgery', 'Emergency']
    }
  ]
};

/**
 * Find nearby fire stations and hospitals
 * @param {Object} center - Center coordinates {lat, lng}
 * @param {number} radiusKm - Search radius in kilometers (default: 5)
 * @returns {Object} { fireStations, hospitals }
 */
export async function findNearbyServices(center, radiusKm = 5) {
  try {
    // For now, using mock data
    // In production, you would call Google Places API here
    
    const fireStations = MOCK_SERVICES.fireStations
      .filter(fs => calculateDistance(center, fs.coords) <= radiusKm)
      .sort((a, b) => calculateDistance(center, a.coords) - calculateDistance(center, b.coords));
    
    const hospitals = MOCK_SERVICES.hospitals
      .filter(h => calculateDistance(center, h.coords) <= radiusKm)
      .sort((a, b) => calculateDistance(center, a.coords) - calculateDistance(center, b.coords));
    
    return {
      fireStations,
      hospitals,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error finding nearby services:', error);
    return { fireStations: [], hospitals: [], error: error.message };
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - {lat, lng}
 * @param {Object} coord2 - {lat, lng}
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate Google Maps direction URL
 * @param {Object} from - Starting coordinates {lat, lng}
 * @param {Object} to - Destination coordinates {lat, lng}
 * @param {string} name - Name of destination
 * @returns {string} Google Maps URL
 */
export function getDirectionsUrl(from, to, name) {
  const params = new URLSearchParams({
    origin: `${from.lat},${from.lng}`,
    destination: `${to.lat},${to.lng}`,
    travelmode: 'driving'
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Generate call URL (tel:)
 * @param {string} phoneNumber - Phone number
 * @returns {string} Tel URL
 */
export function getCallUrl(phoneNumber) {
  return `tel:${phoneNumber.replace(/\D/g, '')}`;
}

/**
 * Get nearest service of a type
 * @param {Array} services - Array of services
 * @param {Object} center - Center coordinates
 * @returns {Object} Nearest service
 */
export function getNearestService(services, center) {
  if (!services || services.length === 0) return null;
  
  return services.reduce((nearest, service) => {
    const distance = calculateDistance(center, service.coords);
    const nearestDistance = calculateDistance(center, nearest.coords);
    return distance < nearestDistance ? service : nearest;
  });
}

/**
 * Get formatted distance string
 * @param {number} distance - Distance in kilometers
 * @returns {string} Formatted distance
 */
export function formatDistance(distance) {
  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)}m`;
  }
  return `${distance.toFixed(1)}km`;
}

/**
 * All available mock services
 */
export function getAllServices() {
  return MOCK_SERVICES;
}
