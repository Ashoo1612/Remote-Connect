import type { Device, Session, ChatMessage, SavedConnection, FileTransfer } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Device management
  getDevice(id: string): Promise<Device | undefined>;
  getDeviceByPartnerId(partnerId: string): Promise<Device | undefined>;
  registerDevice(device: Omit<Device, "id">): Promise<Device>;
  updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined>;
  removeDevice(id: string): Promise<void>;
  getAllOnlineDevices(): Promise<Device[]>;

  // Session management
  getSession(id: string): Promise<Session | undefined>;
  createSession(session: Omit<Session, "id">): Promise<Session>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined>;
  getActiveSessions(): Promise<Session[]>;
  getSessionsByDevice(deviceId: string): Promise<Session[]>;

  // Chat messages
  addMessage(message: Omit<ChatMessage, "id">): Promise<ChatMessage>;
  getSessionMessages(sessionId: string): Promise<ChatMessage[]>;
}

export class MemStorage implements IStorage {
  private devices: Map<string, Device>;
  private sessions: Map<string, Session>;
  private messages: Map<string, ChatMessage>;

  constructor() {
    this.devices = new Map();
    this.sessions = new Map();
    this.messages = new Map();
  }

  // Device management
  async getDevice(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async getDeviceByPartnerId(partnerId: string): Promise<Device | undefined> {
    return Array.from(this.devices.values()).find(
      (device) => device.partnerId === partnerId
    );
  }

  async registerDevice(deviceData: Omit<Device, "id">): Promise<Device> {
    const id = randomUUID();
    const device: Device = { ...deviceData, id };
    this.devices.set(id, device);
    return device;
  }

  async updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    const updatedDevice = { ...device, ...updates };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }

  async removeDevice(id: string): Promise<void> {
    this.devices.delete(id);
  }

  async getAllOnlineDevices(): Promise<Device[]> {
    return Array.from(this.devices.values()).filter((device) => device.isOnline);
  }

  // Session management
  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async createSession(sessionData: Omit<Session, "id">): Promise<Session> {
    const id = randomUUID();
    const session: Session = { ...sessionData, id };
    this.sessions.set(id, session);
    return session;
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async getActiveSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(
      (session) => session.status === "active" || session.status === "connecting"
    );
  }

  async getSessionsByDevice(deviceId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(
      (session) => session.hostDeviceId === deviceId || session.viewerDeviceId === deviceId
    );
  }

  // Chat messages
  async addMessage(messageData: Omit<ChatMessage, "id">): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = { ...messageData, id };
    this.messages.set(id, message);
    return message;
  }

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    return Array.from(this.messages.values()).filter(
      (message) => message.sessionId === sessionId
    );
  }
}

export const storage = new MemStorage();
