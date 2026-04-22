// Crisis Log Manager - Stores timestamped emergency events
const CRISIS_LOG_KEY = "hospitalityproject_crisis_log";

export const crisisLog = {
  // Get all crisis logs
  getAll: () => {
    try {
      const logs = localStorage.getItem(CRISIS_LOG_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error("Error reading crisis logs:", error);
      return [];
    }
  },

  // Add a new crisis entry
  add: (type, location, severity, additionalData = {}) => {
    try {
      const logs = crisisLog.getAll();
      const timestamp = new Date();
      const timeStr = timestamp.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        location,
        severity,
        timestamp: timestamp.toISOString(),
        timeStr,
        status: "Active",
        ...additionalData
      };

      logs.push(entry);
      localStorage.setItem(CRISIS_LOG_KEY, JSON.stringify(logs));
      return entry;
    } catch (error) {
      console.error("Error adding crisis log:", error);
      return null;
    }
  },

  // Update crisis entry
  update: (id, updates) => {
    try {
      const logs = crisisLog.getAll();
      const index = logs.findIndex(log => log.id === id);
      if (index !== -1) {
        logs[index] = { ...logs[index], ...updates };
        localStorage.setItem(CRISIS_LOG_KEY, JSON.stringify(logs));
        return logs[index];
      }
      return null;
    } catch (error) {
      console.error("Error updating crisis log:", error);
      return null;
    }
  },

  // Clear old logs (older than 24 hours)
  cleanup: () => {
    try {
      const logs = crisisLog.getAll();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const now = Date.now();
      
      const recentLogs = logs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return now - logTime < oneDayMs;
      });

      localStorage.setItem(CRISIS_LOG_KEY, JSON.stringify(recentLogs));
    } catch (error) {
      console.error("Error cleaning crisis logs:", error);
    }
  }
};
