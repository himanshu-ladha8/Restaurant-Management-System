import * as signalR from "@microsoft/signalr";
import api from "../api/axiosConfig";

class SignalRService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.eventHandlers = new Map(); // Track registered handlers
  }

  // Get SignalR hub URL
  getHubUrl() {
    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "https://localhost:44300/api";
    // Remove /api from the end if present
    const baseUrl = apiBaseUrl.replace(/\/api$/, "");
    const hubUrl = `${baseUrl}/orderHub`;
    console.log("SignalR Hub URL:", hubUrl);
    return hubUrl;
  }

  // Start connection
  async startConnection(userId, userRole, restaurantId = null) {
    // If already connected, just ensure groups are joined
    if (this.connection && this.isConnected) {
      console.log("SignalR already connected, joining groups...");
      await this.joinGroups(userId, userRole, restaurantId);
      return;
    }

    // If connection exists but not connected, try to start it
    if (this.connection && !this.isConnected) {
      try {
        await this.connection.start();
        this.isConnected = true;
        console.log("SignalR reconnected");
        await this.joinGroups(userId, userRole, restaurantId);
        return;
      } catch (error) {
        console.error("Error restarting SignalR connection:", error);
        // Fall through to create new connection
      }
    }

    try {
      const hubUrl = this.getHubUrl();
      console.log("Starting SignalR connection to:", hubUrl);
      
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => {
            const token = localStorage.getItem("token") || "";
            console.log("SignalR token:", token ? "Present" : "Missing");
            return token;
          },
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.previousRetryCount < 3) {
              return 2000; // 2 seconds
            }
            return 10000; // 10 seconds
          }
        })
        .build();

      // Connection event handlers
      this.connection.onclose((error) => {
        this.isConnected = false;
        console.log("SignalR connection closed", error ? `Error: ${error}` : "");
      });

      this.connection.onreconnecting((error) => {
        console.log("SignalR reconnecting...", error ? `Error: ${error}` : "");
      });

      this.connection.onreconnected((connectionId) => {
        this.isConnected = true;
        console.log("SignalR reconnected. Connection ID:", connectionId);
        // Rejoin groups after reconnection
        this.joinGroups(userId, userRole, restaurantId);
      });

      await this.connection.start();
      this.isConnected = true;
      console.log("SignalR connected successfully. Connection ID:", this.connection.connectionId);

      // Join appropriate groups
      await this.joinGroups(userId, userRole, restaurantId);
    } catch (error) {
      console.error("Error starting SignalR connection:", error);
      this.isConnected = false;
      // Don't throw - allow app to continue without SignalR
    }
  }

  // Join groups based on user role
  async joinGroups(userId, userRole, restaurantId) {
    if (!this.connection) {
      console.warn("Cannot join groups: Connection not established");
      return;
    }

    if (!this.isConnected) {
      console.warn("Cannot join groups: Connection not active");
      return;
    }

    try {
      if (userRole === "Customer" && userId) {
        await this.connection.invoke("JoinCustomerGroup", parseInt(userId));
        console.log(`✅ Joined customer group: customer_${userId}`);
      } else if (userRole === "RestaurantAdmin" && restaurantId) {
        await this.connection.invoke("JoinRestaurantGroup", parseInt(restaurantId));
        console.log(`✅ Joined restaurant group: restaurant_${restaurantId}`);
      } else {
        console.warn("Cannot join groups: Missing userId or restaurantId", { userId, userRole, restaurantId });
      }
    } catch (error) {
      console.error("❌ Error joining groups:", error);
    }
  }

  // Stop connection
  async stopConnection() {
    if (this.connection) {
      try {
        await this.connection.stop();
        this.isConnected = false;
        console.log("SignalR connection stopped");
      } catch (error) {
        console.error("Error stopping SignalR connection:", error);
      }
    }
  }

  // Register event handlers
  on(eventName, callback) {
    if (this.connection && this.isConnected) {
      this.connection.on(eventName, (data) => {
        console.log(`📨 SignalR event received: ${eventName}`, data);
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${eventName} handler:`, error);
        }
      });
      console.log(`✅ SignalR event handler registered: ${eventName}`);
    } else {
      console.warn(`⚠️ Cannot register event handler for ${eventName}: Connection not established or not connected`);
      // If connection exists but not connected, wait and retry
      if (this.connection && !this.isConnected) {
        console.log(`⏳ Waiting for connection to establish before registering ${eventName}...`);
        setTimeout(() => {
          if (this.isConnected) {
            this.on(eventName, callback);
          }
        }, 1000);
      }
    }
  }

  // Remove event handlers
  off(eventName, callback) {
    if (this.connection) {
      if (callback) {
        this.connection.off(eventName, callback);
      } else {
        // Remove all handlers for this event
        this.connection.off(eventName);
      }
      console.log(`SignalR event handler removed: ${eventName}`);
    }
  }
}

// Export singleton instance
const signalRService = new SignalRService();
export default signalRService;

