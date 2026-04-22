// Web Notifications API Integration
// Handles browser desktop notifications that persist outside the tab

export const notificationManager = {
  // Request notification permission
  async requestPermission() {
    if (!("Notification" in window)) {
      console.log("Browser does not support Web Notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  },

  // Send desktop notification
  async sendEmergencyNotification(type, location, severity) {
    const hasPermission = await this.requestPermission();
    
    if (!hasPermission) {
      console.log("Notification permission denied");
      return;
    }

    const title = `🚨 ${type} EMERGENCY - LEVEL ${severity}`;
    const options = {
      body: `Location: ${location}\nImmediate action required!`,
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23dc2626'/><text x='50' y='60' font-size='60' text-anchor='middle' fill='white' font-weight='bold'>!</text></svg>",
      badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23dc2626'/></svg>",
      tag: `emergency-${type.toLowerCase()}`,
      requireInteraction: true, // Keeps notification until user interacts
      silent: false,
      timestamp: Date.now(),
      actions: [
        {
          action: "acknowledge",
          title: "Acknowledge"
        },
        {
          action: "escalate",
          title: "Escalate"
        }
      ]
    };

    try {
      const notification = new Notification(title, options);

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Handle actions
      notification.onaction = (event) => {
        console.log(`User action: ${event.action}`);
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  },

  // Check if notifications are available
  isSupported() {
    return "Notification" in window;
  }
};
