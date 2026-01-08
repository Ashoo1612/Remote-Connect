import type { Device, SavedConnection } from "@shared/schema";

// Generate a random 9-digit partner ID
export function generatePartnerId(): string {
  const digits = "0123456789";
  let id = "";
  for (let i = 0; i < 9; i++) {
    id += digits[Math.floor(Math.random() * digits.length)];
  }
  return id;
}

// Format partner ID with spaces for readability (XXX XXX XXX)
export function formatPartnerId(id: string): string {
  const cleaned = id.replace(/\s/g, "");
  return cleaned.match(/.{1,3}/g)?.join(" ") || id;
}

// Get or create device info from localStorage
export function getDeviceInfo(): Device {
  const stored = localStorage.getItem("remotedesk-device");
  if (stored) {
    return JSON.parse(stored);
  }

  const device: Device = {
    id: crypto.randomUUID(),
    name: getDeviceName(),
    partnerId: generatePartnerId(),
    isOnline: true,
  };

  localStorage.setItem("remotedesk-device", JSON.stringify(device));
  return device;
}

// Get device name based on user agent
function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows PC";
  if (ua.includes("Mac")) return "Mac";
  if (ua.includes("Linux")) return "Linux PC";
  if (ua.includes("Android")) return "Android Device";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS Device";
  return "Unknown Device";
}

// Saved connections management
export function getSavedConnections(): SavedConnection[] {
  const stored = localStorage.getItem("remotedesk-saved-connections");
  return stored ? JSON.parse(stored) : [];
}

export function addSavedConnection(connection: Omit<SavedConnection, "id">): SavedConnection {
  const connections = getSavedConnections();
  const newConnection: SavedConnection = {
    ...connection,
    id: crypto.randomUUID(),
  };
  connections.push(newConnection);
  localStorage.setItem("remotedesk-saved-connections", JSON.stringify(connections));
  return newConnection;
}

export function removeSavedConnection(id: string): void {
  const connections = getSavedConnections().filter((c) => c.id !== id);
  localStorage.setItem("remotedesk-saved-connections", JSON.stringify(connections));
}

export function updateSavedConnection(id: string, updates: Partial<SavedConnection>): void {
  const connections = getSavedConnections().map((c) =>
    c.id === id ? { ...c, ...updates } : c
  );
  localStorage.setItem("remotedesk-saved-connections", JSON.stringify(connections));
}
