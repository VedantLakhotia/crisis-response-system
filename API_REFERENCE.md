# Emergency Notification System - API Reference

## Crisis Log API

### `crisisLog.add(type, location, severity, additionalData)`

Adds a new emergency entry to the crisis log.

**Parameters:**
- `type` (string): Emergency type (e.g., "FIRE", "MEDICAL")
- `location` (string): Location/floor information
- `severity` (number): 1-5 severity level
- `additionalData` (object, optional): Any extra data to store

**Returns:**
```javascript
{
  id: string,           // Unique event ID
  type: string,         // Emergency type
  location: string,     // Location info
  severity: number,     // 1-5 severity
  timestamp: string,    // ISO timestamp
  timeStr: string,      // Formatted time (HH:MM:SS)
  status: string,       // "Active" or "Resolved"
  ...additionalData     // Custom fields
}
```

**Example:**
```javascript
import { crisisLog } from './utils/crisisLog';

const entry = crisisLog.add('FIRE', '3rd Floor Zone A', 4, {
  responders: 2,
  detected_by: 'Smoke Detector #12'
});

console.log(entry.id);        // "1713792126123-abc3d5e"
console.log(entry.timeStr);   // "14:22:06"
```

---

### `crisisLog.getAll()`

Retrieves all crisis log entries from localStorage.

**Returns:**
```javascript
Array of log entries
```

**Example:**
```javascript
const allLogs = crisisLog.getAll();
console.log(`Total emergencies: ${allLogs.length}`);

allLogs.forEach(log => {
  console.log(`${log.timeStr} - ${log.type} at ${log.location}`);
});
```

---

### `crisisLog.update(id, updates)`

Updates an existing log entry.

**Parameters:**
- `id` (string): Log entry ID
- `updates` (object): Fields to update

**Returns:**
```javascript
Updated entry object or null if not found
```

**Example:**
```javascript
crisisLog.update('1713792126123-abc3d5e', {
  status: 'Resolved',
  resolvedBy: 'John Smith',
  resolvedAt: new Date().toISOString()
});
```

---

### `crisisLog.cleanup()`

Removes log entries older than 24 hours.

**Example:**
```javascript
// Call daily or on app startup
crisisLog.cleanup();
```

---

## Sound Manager API

### `soundManager.playEmergencyTone()`

Plays the emergency alert tone sequence (siren-like).

**Returns:**
```javascript
Promise that resolves when sound finishes
```

**Example:**
```javascript
import { soundManager } from './utils/alertSound';

// Play and wait for completion
await soundManager.playEmergencyTone();
console.log('Alert sequence finished');
```

---

### `soundManager.playHighPriorityBeep()`

Plays a single high-frequency beep (1400 Hz).

**Example:**
```javascript
// Immediate call, no wait needed
soundManager.playHighPriorityBeep();
```

---

### `soundManager.playConfirmation()`

Plays a confirmation sound (positive tone).

**Example:**
```javascript
soundManager.playConfirmation();
```

---

## Web Notifications API

### `notificationManager.requestPermission()`

Requests user permission for desktop notifications.

**Returns:**
```javascript
Promise<boolean> - true if permission granted
```

**Example:**
```javascript
import { notificationManager } from './utils/webNotifications';

const hasPermission = await notificationManager.requestPermission();
if (hasPermission) {
  console.log('Notification permission granted');
}
```

---

### `notificationManager.sendEmergencyNotification(type, location, severity)`

Sends a desktop notification.

**Parameters:**
- `type` (string): Emergency type
- `location` (string): Location info
- `severity` (number): 1-5 severity level

**Returns:**
```javascript
Promise<Notification> or null if failed
```

**Example:**
```javascript
await notificationManager.sendEmergencyNotification(
  'FIRE',
  '2nd Floor, Kitchen Area',
  5
);
```

---

### `notificationManager.isSupported()`

Checks if browser supports Web Notifications API.

**Returns:**
```javascript
boolean
```

**Example:**
```javascript
if (!notificationManager.isSupported()) {
  console.log('Desktop notifications not supported in this browser');
}
```

---

## WebSocket Simulator API

### `socket.emit(eventName, data)`

Simulates sending an event to all connected dashboards.

**Parameters:**
- `eventName` (string): Event name (e.g., 'emergency_fire')
- `data` (object): Data to broadcast

**Returns:**
```javascript
Promise<{ success: true, event: string, data: object }>
```

**Example:**
```javascript
import { socket } from './utils/websocketSimulator';

await socket.emit('emergency_fire', {
  type: 'FIRE',
  location: 'Zone A',
  severity: 4,
  timestamp: new Date().toISOString()
});
```

---

### `socket.on(eventName, callback)`

Registers a listener for incoming events (simulated).

**Parameters:**
- `eventName` (string): Event name
- `callback` (function): Handler function

**Example:**
```javascript
socket.on('emergency_fire', (data) => {
  console.log('Fire emergency received:', data);
  updateUI(data);
});
```

---

### `socket.off(eventName, callback)`

Removes an event listener.

**Example:**
```javascript
const handler = (data) => console.log(data);
socket.on('emergency_fire', handler);

// Later...
socket.off('emergency_fire', handler);
```

---

### `socket.connected()`

Checks if WebSocket is connected.

**Returns:**
```javascript
boolean
```

**Example:**
```javascript
if (socket.connected()) {
  console.log('Connected to emergency broadcast system');
}
```

---

## Component APIs

### `FireButton`

```jsx
<FireButton 
  onFireActivated={(emergencyData) => {
    // Called when fire emergency is submitted
    console.log(emergencyData);
    // {
    //   type: "FIRE",
    //   location: "...",
    //   severity: 1-5,
    //   logEntry: { id, timestamp, ... }
    // }
  }}
/>
```

---

### `EmergencyModal`

```jsx
<EmergencyModal
  isOpen={true}
  emergencyType="FIRE"
  onSubmit={(details) => {
    // { severity: 1-5, location: string }
    console.log(details);
  }}
  onClose={() => setShowModal(false)}
  isSubmitting={false}
/>
```

---

### `CrisisLogDisplay`

```jsx
<CrisisLogDisplay />
// Auto-updates from crisis log changes
// No props required
```

---

### `EmergencyFlashOverlay`

```jsx
<EmergencyFlashOverlay 
  isActive={true}
  duration={3000}  // milliseconds
/>
```

---

## Integration Examples

### Example 1: Custom Emergency Handler

```javascript
import { FireButton } from './components/FireButton';
import { crisisLog } from './utils/crisisLog';
import { socket } from './utils/websocketSimulator';
import { notificationManager } from './utils/webNotifications';

function MyApp() {
  const handleFireActivated = async (emergencyData) => {
    // Send to backend API
    try {
      const response = await fetch('/api/emergencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: emergencyData.type,
          location: emergencyData.location,
          severity: emergencyData.severity,
          timestamp: new Date().toISOString()
        })
      });

      // Notify all staff
      const response_data = await response.json();
      await socket.emit('emergency_broadcast', response_data);

      // Send email alerts
      await fetch('/api/alerts/email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'first_responders@hospital.com',
          subject: `${emergencyData.type} Emergency - Level ${emergencyData.severity}`,
          body: `Location: ${emergencyData.location}`
        })
      });

    } catch (error) {
      console.error('Error handling fire emergency:', error);
    }
  };

  return <FireButton onFireActivated={handleFireActivated} />;
}
```

---

### Example 2: Real-time Updates

```javascript
import { useEffect, useState } from 'react';
import { crisisLog } from './utils/crisisLog';

function EmergencyDashboard() {
  const [activeEmergencies, setActiveEmergencies] = useState([]);

  useEffect(() => {
    // Load initial logs
    setActiveEmergencies(crisisLog.getAll());

    // Listen for updates
    const handleUpdate = () => {
      const logs = crisisLog.getAll();
      setActiveEmergencies(logs.filter(log => log.status === 'Active'));
    };

    window.addEventListener('crisisLogUpdated', handleUpdate);
    return () => window.removeEventListener('crisisLogUpdated', handleUpdate);
  }, []);

  return (
    <div>
      {activeEmergencies.map(emergency => (
        <div key={emergency.id}>
          <h3>{emergency.type} - Level {emergency.severity}</h3>
          <p>{emergency.location}</p>
          <p>{emergency.timeStr}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### Example 3: Multi-Type Emergencies

```javascript
// Create a generic emergency button component

function EmergencyButton({ type, color }) {
  const handleEmergency = async (details) => {
    const logEntry = crisisLog.add(type, details.location, details.severity);
    
    await socket.emit(`emergency_${type.toLowerCase()}`, {
      type,
      ...details,
      logId: logEntry.id
    });

    await notificationManager.sendEmergencyNotification(
      type,
      details.location,
      details.severity
    );
  };

  return (
    <button onClick={() => setShowModal(true)}>
      {type}
    </button>
  );
}
```

---

## Error Handling

### Wrap API calls with try-catch

```javascript
import { soundManager } from './utils/alertSound';
import { notificationManager } from './utils/webNotifications';

async function initializeEmergency(type, location, severity) {
  try {
    // Play sound with error handling
    try {
      await soundManager.playEmergencyTone();
    } catch (audioError) {
      console.warn('Audio playback failed:', audioError);
      // Continue even if audio fails
    }

    // Send notification with error handling
    try {
      await notificationManager.sendEmergencyNotification(
        type,
        location,
        severity
      );
    } catch (notifError) {
      console.warn('Notification failed:', notifError);
      // Continue even if notification fails
    }

  } catch (error) {
    console.error('Emergency initialization failed:', error);
    toast.error('Failed to process emergency');
  }
}
```

---

## Performance Tips

1. **Debounce Crisis Log Updates**
   ```javascript
   // Don't update UI on every log change
   const [logs, setLogs] = useState([]);
   const updateTimeout = useRef(null);

   const handleLogUpdate = () => {
     clearTimeout(updateTimeout.current);
     updateTimeout.current = setTimeout(() => {
       setLogs(crisisLog.getAll());
     }, 500);
   };
   ```

2. **Lazy Load Notifications**
   ```javascript
   // Request permission only when needed
   const [hasPermission, setHasPermission] = useState(null);

   const ensurePermission = async () => {
     if (hasPermission === null) {
       const perm = await notificationManager.requestPermission();
       setHasPermission(perm);
     }
     return hasPermission;
   };
   ```

3. **Clean Up Old Logs**
   ```javascript
   useEffect(() => {
     // Clean up on app load
     crisisLog.cleanup();
   }, []);
   ```

---

**For more information, see [EMERGENCY_SYSTEM.md](EMERGENCY_SYSTEM.md)**
