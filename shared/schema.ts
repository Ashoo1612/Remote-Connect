import { z } from "zod";

// Device - represents a machine that can connect
export const deviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  partnerId: z.string(), // 9-digit connection ID like TeamViewer
  isOnline: z.boolean(),
  lastSeen: z.string().optional(),
});

export type Device = z.infer<typeof deviceSchema>;

export const insertDeviceSchema = deviceSchema.omit({ id: true });
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

// Session - an active remote connection
export const sessionSchema = z.object({
  id: z.string(),
  hostDeviceId: z.string(),
  viewerDeviceId: z.string(),
  status: z.enum(["pending", "connecting", "active", "ended"]),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  quality: z.enum(["excellent", "good", "fair", "poor"]).optional(),
});

export type Session = z.infer<typeof sessionSchema>;

export const insertSessionSchema = sessionSchema.omit({ id: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;

// Chat message during a session
export const chatMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  senderId: z.string(),
  content: z.string(),
  timestamp: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const insertChatMessageSchema = chatMessageSchema.omit({ id: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// File transfer
export const fileTransferSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  senderId: z.string(),
  status: z.enum(["pending", "transferring", "completed", "failed"]),
  progress: z.number(),
});

export type FileTransfer = z.infer<typeof fileTransferSchema>;

export const insertFileTransferSchema = fileTransferSchema.omit({ id: true });
export type InsertFileTransfer = z.infer<typeof insertFileTransferSchema>;

// Saved connection (address book entry)
export const savedConnectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  partnerId: z.string(),
  description: z.string().optional(),
  lastConnected: z.string().optional(),
});

export type SavedConnection = z.infer<typeof savedConnectionSchema>;

export const insertSavedConnectionSchema = savedConnectionSchema.omit({ id: true });
export type InsertSavedConnection = z.infer<typeof insertSavedConnectionSchema>;

// WebRTC Signaling messages
export const signalingMessageSchema = z.object({
  type: z.enum(["offer", "answer", "ice-candidate", "join", "leave", "start-remote", "start-sharing", "end-session", "session-ended", "online-devices", "joined", "error", "chat-message", "pointer-move"]),
  from: z.string(),
  to: z.string(),
  payload: z.any().optional(),
});

export type SignalingMessage = z.infer<typeof signalingMessageSchema>;

// Connection request
export const connectionRequestSchema = z.object({
  partnerId: z.string().min(9).max(12),
});

export type ConnectionRequest = z.infer<typeof connectionRequestSchema>;

// Legacy user types for compatibility
export const users = {
  id: "",
  username: "",
  password: "",
};

export type User = {
  id: string;
  username: string;
  password: string;
};

export type InsertUser = Omit<User, "id">;
