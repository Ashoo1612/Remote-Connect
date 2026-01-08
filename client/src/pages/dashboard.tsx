import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Copy, Check, Shield, Monitor, Wifi, WifiOff, Users, AlertCircle, Download, MousePointer2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getDeviceInfo, formatPartnerId } from "@/lib/device-store";
import type { Device } from "@shared/schema";

interface OnlineDevice {
  partnerId: string;
  name: string;
}

interface ShareRequest {
  from: string;
  fromName: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [device, setDevice] = useState<Device | null>(null);
  const [onlineDevices, setOnlineDevices] = useState<OnlineDevice[]>([]);
  const [copied, setCopied] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [shareRequest, setShareRequest] = useState<ShareRequest | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const deviceInfo = getDeviceInfo();
    setDevice(deviceInfo);

    // Connect to WebSocket for real-time online devices
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      // Join the signaling server
      ws.send(JSON.stringify({
        type: "join",
        from: deviceInfo.partnerId,
        to: "server",
        payload: { name: deviceInfo.name },
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === "online-devices") {
        // Filter out self from online devices list
        const others = message.payload.filter(
          (d: OnlineDevice) => d.partnerId !== deviceInfo.partnerId
        );
        setOnlineDevices(others);
      }
      
      if (message.type === "start-sharing") {
        // Someone wants to view our screen - show confirmation dialog
        setShareRequest({
          from: message.from,
          fromName: message.payload?.controllerName || "Unknown Device",
        });
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "leave",
          from: deviceInfo.partnerId,
          to: "server",
        }));
      }
      ws.close();
    };
  }, []);

  const handleCopyId = () => {
    if (device) {
      navigator.clipboard.writeText(device.partnerId);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Your Partner ID has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnectToDevice = (targetPartnerId: string) => {
    // Send start-remote signal and navigate to session as controller
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "start-remote",
        from: device?.partnerId,
        to: targetPartnerId,
      }));
    }
    setLocation(`/session?role=controller&target=${targetPartnerId}`);
  };

  const handleAcceptShare = () => {
    if (!shareRequest || !device) return;
    setShareRequest(null);
    // Navigate to session - screen capture will start there
    setLocation(`/session?role=sharer&controller=${shareRequest.from}`);
  };

  const handleDeclineShare = () => {
    setShareRequest(null);
    toast({
      title: "Request declined",
      description: "You declined the screen share request",
    });
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold" data-testid="text-dashboard-title">Welcome to RemoteDesk</h1>
          <p className="text-muted-foreground">
            Connect to any online computer or allow remote assistance
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Your Device</CardTitle>
              </div>
              <CardDescription>
                Share your Partner ID to receive remote assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Your Partner ID
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border bg-muted/50 px-4 py-3">
                    <span className="font-mono text-2xl font-semibold tracking-wider" data-testid="text-partner-id">
                      {device ? formatPartnerId(device.partnerId) : "---  ---  ---"}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyId}
                    data-testid="button-copy-id"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                {wsConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">Online - Ready for connections</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Connecting...</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Online Devices</CardTitle>
                <Badge variant="secondary" className="ml-auto">
                  {onlineDevices.length}
                </Badge>
              </div>
              <CardDescription>
                Click on a device to start viewing their screen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {onlineDevices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Monitor className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    No other devices online
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Open RemoteDesk on another device to see it here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {onlineDevices.map((otherDevice) => (
                    <div
                      key={otherDevice.partnerId}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 hover-elevate"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Monitor className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium" data-testid={`text-device-name-${otherDevice.partnerId}`}>
                            {otherDevice.name}
                          </p>
                          <p className="font-mono text-sm text-muted-foreground">
                            {formatPartnerId(otherDevice.partnerId)}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleConnectToDevice(otherDevice.partnerId)}
                        data-testid={`button-connect-${otherDevice.partnerId}`}
                      >
                        Connect
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Desktop App Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MousePointer2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Full Remote Control</CardTitle>
              <Badge variant="secondary" className="ml-auto">Desktop App</Badge>
            </div>
            <CardDescription>
              Download the desktop app for full mouse and keyboard control
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 rounded-lg border p-4 bg-muted/30">
              <Download className="h-8 w-8 text-primary mt-1" />
              <div className="flex-1 space-y-2">
                <p className="text-sm">
                  The web app only supports visual guidance (showing your pointer to the other person). 
                  For full remote control of mouse and keyboard, both users need the desktop app.
                </p>
                <div className="space-y-3">
                  <p className="text-sm font-medium">Get the Desktop App:</p>
                  <ol className="list-decimal list-inside text-sm space-y-2 text-muted-foreground">
                    <li>Download the <code className="bg-muted px-1 rounded">desktop-app</code> folder</li>
                    <li>Push it to a GitHub repository</li>
                    <li>GitHub Actions will automatically build the .exe</li>
                    <li>Download from the Releases page</li>
                  </ol>
                  <p className="text-xs">
                    See <code className="bg-muted px-1 rounded">desktop-app/GITHUB_SETUP.md</code> for detailed instructions.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Windows 10/11 required. Both computers need the desktop app for full remote control.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Share Request Dialog */}
      <Dialog open={!!shareRequest} onOpenChange={() => setShareRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Remote Connection Request
            </DialogTitle>
            <DialogDescription>
              Someone wants to view your screen. Do you want to allow this?
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Monitor className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{shareRequest?.fromName}</p>
              <p className="font-mono text-sm text-muted-foreground">
                {shareRequest ? formatPartnerId(shareRequest.from) : ""}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleDeclineShare}
              data-testid="button-decline-share"
            >
              Decline
            </Button>
            <Button
              onClick={handleAcceptShare}
              data-testid="button-accept-share"
            >
              Allow Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
