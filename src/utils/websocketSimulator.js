// WebSocket Simulator for Emergency Broadcasting
// In production, replace with actual WebSocket connection

class WebSocketSimulator {
  constructor() {
    this.listeners = {};
    this.isConnected = true;
  }

  // Simulate socket.on()
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  }

  // Simulate socket.emit()
  emit(eventName, data) {
    console.log(`[WebSocket Simulation] Emitting: ${eventName}`, data);
    
    // Simulate broadcast to other staff dashboards
    this._broadcastEvent(eventName, data);

    // Return promise for async handling
    return Promise.resolve({ success: true, event: eventName, data });
  }

  // Simulate removal of listeners
  off(eventName, callback) {
    if (this.listeners[eventName]) {
      this.listeners[eventName] = this.listeners[eventName].filter(
        listener => listener !== callback
      );
    }
  }

  // Internal broadcast simulation
  _broadcastEvent(eventName) {
    // In production, this would be handled by the server
    // For now, we'll just log it and show it went to all connected clients
    const connectedClients = Math.floor(Math.random() * 8) + 3; // 3-10 staff members
    
    console.log(`[Emergency Broadcast] Event: ${eventName} sent to ${connectedClients} staff dashboards`);
    
    // Simulate acknowledgment from other clients
    setTimeout(() => {
      if (this.listeners[`${eventName}_ack`]) {
        this.listeners[`${eventName}_ack`].forEach(callback => {
          callback({
            receivedBy: connectedClients,
            timestamp: new Date().toISOString()
          });
        });
      }
    }, 500);
  }

  // Connection status
  connected() {
    return this.isConnected;
  }

  // Simulate disconnection
  disconnect() {
    this.isConnected = false;
  }

  // Simulate reconnection
  connect() {
    this.isConnected = true;
  }
}

// Export singleton instance
export const socket = new WebSocketSimulator();
