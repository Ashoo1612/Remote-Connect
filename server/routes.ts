import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";

// Map of partnerId -> WebSocket connection
const connections = new Map<string, WebSocket>();

// Map of partnerId -> device name
const deviceNames = new Map<string, string>();

// Broadcast online devices list to all connected clients
function broadcastOnlineDevices() {
  const onlineDevices = Array.from(connections.keys()).map(partnerId => ({
    partnerId,
    name: deviceNames.get(partnerId) || "Unknown Device",
  }));

  const message = JSON.stringify({
    type: "online-devices",
    from: "server",
    to: "all",
    payload: onlineDevices,
  });

  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Create WebSocket server for signaling
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    let devicePartnerId: string | null = null;

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case "join": {
            // Device joining the signaling server
            const partnerId = message.from as string;
            devicePartnerId = partnerId;
            const deviceName = message.payload?.name || "Unknown Device";
            
            connections.set(partnerId, ws);
            deviceNames.set(partnerId, deviceName);
            
            // Register or update device in storage
            let device = await storage.getDeviceByPartnerId(partnerId);
            if (!device) {
              device = await storage.registerDevice({
                partnerId: partnerId,
                name: deviceName,
                isOnline: true,
                lastSeen: new Date().toISOString(),
              });
            } else {
              await storage.updateDevice(device.id, {
                name: deviceName,
                isOnline: true,
                lastSeen: new Date().toISOString(),
              });
            }

            // Notify client of successful join
            ws.send(JSON.stringify({
              type: "joined",
              from: "server",
              to: partnerId,
              payload: { deviceId: device.id },
            }));

            // Broadcast updated online devices list to all
            broadcastOnlineDevices();
            break;
          }

          case "start-remote": {
            // Controller wants to view target's screen
            // Send message to target to start sharing
            const targetPartnerId = message.to;
            const controllerPartnerId = message.from as string;
            const targetWs = connections.get(targetPartnerId);

            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              // Create session
              const session = await storage.createSession({
                hostDeviceId: targetPartnerId,
                viewerDeviceId: controllerPartnerId,
                status: "connecting",
                startedAt: new Date().toISOString(),
              });

              // Get controller's name
              const controllerName = deviceNames.get(controllerPartnerId) || "Unknown Device";

              // Tell target to start sharing their screen
              targetWs.send(JSON.stringify({
                type: "start-sharing",
                from: controllerPartnerId,
                to: targetPartnerId,
                payload: { 
                  sessionId: session.id,
                  controllerName: controllerName,
                },
              }));
            } else {
              // Target device not online
              ws.send(JSON.stringify({
                type: "error",
                from: "server",
                to: controllerPartnerId,
                payload: { error: "Device not available" },
              }));
            }
            break;
          }

          case "offer":
          case "answer":
          case "ice-candidate": {
            // Forward WebRTC signaling messages
            const targetWs = connections.get(message.to);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify(message));
            }
            break;
          }

          case "chat-message": {
            // Forward chat messages between connected peers
            const targetWs = connections.get(message.to);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: "chat-message",
                from: message.from,
                to: message.to,
                payload: message.payload,
              }));
            }
            break;
          }

          case "pointer-move": {
            // Forward pointer position to remote peer
            const targetWs = connections.get(message.to);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: "pointer-move",
                from: message.from,
                to: message.to,
                payload: message.payload,
              }));
            }
            break;
          }

          case "end-session": {
            // End the remote session
            const targetWs = connections.get(message.to);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: "session-ended",
                from: message.from,
                to: message.to,
              }));
            }
            break;
          }

          case "leave": {
            // Device leaving/disconnecting
            if (devicePartnerId) {
              const device = await storage.getDeviceByPartnerId(devicePartnerId);
              if (device) {
                await storage.updateDevice(device.id, {
                  isOnline: false,
                  lastSeen: new Date().toISOString(),
                });
              }
              connections.delete(devicePartnerId);
              deviceNames.delete(devicePartnerId);
              broadcastOnlineDevices();
            }
            break;
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", async () => {
      if (devicePartnerId) {
        const device = await storage.getDeviceByPartnerId(devicePartnerId);
        if (device) {
          await storage.updateDevice(device.id, {
            isOnline: false,
            lastSeen: new Date().toISOString(),
          });
        }
        connections.delete(devicePartnerId);
        deviceNames.delete(devicePartnerId);
        broadcastOnlineDevices();
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // REST API endpoints

  // Get device by partner ID
  app.get("/api/devices/:partnerId", async (req, res) => {
    const device = await storage.getDeviceByPartnerId(req.params.partnerId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }
    res.json(device);
  });

  // Check if device is online
  app.get("/api/devices/:partnerId/status", async (req, res) => {
    const device = await storage.getDeviceByPartnerId(req.params.partnerId);
    if (!device) {
      return res.json({ online: false });
    }
    res.json({ online: device.isOnline, lastSeen: device.lastSeen });
  });

  // Get all online devices
  app.get("/api/devices/online", async (req, res) => {
    const devices = await storage.getAllOnlineDevices();
    res.json(devices);
  });

  // Get active sessions
  app.get("/api/sessions", async (req, res) => {
    const sessions = await storage.getActiveSessions();
    res.json(sessions);
  });

  // Get session by ID
  app.get("/api/sessions/:id", async (req, res) => {
    const session = await storage.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(session);
  });

  // Get session messages
  app.get("/api/sessions/:id/messages", async (req, res) => {
    const messages = await storage.getSessionMessages(req.params.id);
    res.json(messages);
  });

  return httpServer;
}
