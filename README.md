# 🚨 Crisis Control Center

**Google Solution Challenge - Final Product Prototype**

A real-time hospitality emergency response and crisis management system. This application provides a comprehensive suite of tools for hotel staff, guests, and administrators to coordinate multi-channel emergency notifications, track live dispatch units, and manage active crisis scenarios.

## ✨ Key Features

- **Immediate Panic Triggers**: Instantly trigger categorized alerts (Fire 🔥, Medical 🚑, Security 🛡️, System/Other ⚠️).
- **Multi-Channel Notification System**: 
  - High-priority desktop notifications via Web Notifications API.
  - Audio alerts (sirens and confirmation beeps) powered by the Web Audio API.
  - Pulsing on-screen visual overlays for immediate operator attention.
- **Live Interactive Map & Dispatch Tracking**:
  - Real-time location pinning using the Google Maps API.
  - Automatic identification of nearby emergency services (Hospitals, Fire Stations, Police) via Overpass API.
  - Live visual dispatch routing showing ETA and estimated paths using Leaflet and OSRM.
- **Automated Crisis Logging**: Real-time Firebase Firestore synchronization with timestamped entries, severity scaling, and status updates (Pending, Confirmed, En-Route, Resolved).
- **Role-Based Access & Persistent Authentication**: Staff, Guest, and Admin portals with secured login and token extension functionality.
- **Emergency Protocols**: Built-in, quick-reference Standard Operating Procedures (SOPs) for active crisis scenarios.

## 🛠️ Technology Stack

- **Frontend Framework**: React + Vite
- **Styling & UI**: Tailwind CSS, Framer Motion, Lucide-React, React Hot Toast / Sonner
- **Database & Backend**: Firebase (Firestore for real-time syncing)
- **Mapping & Routing**: 
  - `@vis.gl/react-google-maps`
  - `react-leaflet` / `leaflet`
  - OpenStreetMap / Overpass API / OSRM (Open Source Routing Machine)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- NPM or Yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd "Google Solution Challenge"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and add your API keys:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   # Add Firebase configuration keys as needed
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

## 📚 Documentation & Reference

For a deep dive into the system's architecture and capabilities, please refer to the following documentation files included in the project:

- EMERGENCY_SYSTEM.md - Comprehensive overview of the Multi-Channel Emergency Notification System.
- IMPLEMENTATION_SUMMARY.md - Detailed implementation status and workflow traces.
- API_REFERENCE.md - Developer reference for the Crisis Log, Sound Manager, and WebSocket simulator APIs.
- PERSISTENT_AUTH_GUIDE.md & ADVANCED_AUTH_FEATURES.md - Auth workflows, role routing, and security.

## 🤝 Contributing

This project was developed for the **Google Solution Challenge**. Contributions, bug reports, and feature requests are welcome. 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
