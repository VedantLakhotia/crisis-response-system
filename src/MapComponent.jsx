import { APIProvider, Map, Marker, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';

// --- SUB-COMPONENT: DRAWING THE LINE (ROUTING) ---
function Directions({ origin, destination }) {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState();
  const [directionsRenderer, setDirectionsRenderer] = useState();

  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ map }));
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !origin || !destination) return;

    directionsService.route({
      origin: origin,
      destination: destination,
      travelMode: window.google.maps.TravelMode.WALKING,
    }).then((response) => {
      directionsRenderer.setDirections(response);
    });
  }, [directionsService, directionsRenderer, origin, destination]);

  return null;
}

// --- MAIN MAP COMPONENT ---
function MapComponent({ alerts, staff }) {
  const hotelCenter = { lat: 22.7196, lng: 75.8577 }; // IIPS Indore
  const API_KEY = 'AIzaSyAq9afG542PH6dlxtnm3-dJS5-hozfW53Q';

  return (
    <APIProvider apiKey={API_KEY}>
      <div style={{ height: '400px', width: '100%', borderRadius: '15px', overflow: 'hidden' }}>
        <Map defaultCenter={hotelCenter} defaultZoom={15} disableDefaultUI={true}>
          
          {/* 1. INCIDENT MARKERS (Red 🔥) */}
          {alerts.map((alert) => (
            alert.coords && <Marker key={alert.id} position={alert.coords} label="🔥" />
          ))}

          {/* 2. STAFF MARKERS (Officer 👮) */}
          {staff.map((member) => (
            member.coords && <Marker key={member.id} position={member.coords} label="👮" />
          ))}

          {/* 3. THE PATH (Draws from first staff to first alert) */}
          {alerts.length > 0 && staff.length > 0 && (
            <Directions origin={staff[0].coords} destination={alerts[0].coords} />
          )}
        </Map>
      </div>
    </APIProvider>
  );
}

export default MapComponent;