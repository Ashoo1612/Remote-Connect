import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Maximize2,
  Minimize2,
  MessageSquare,
  PhoneOff,
  Wifi,
  Clock,
  X,
  Send,
  Loader2,
  Monitor,
  MousePointer2,
  Keyboard,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatPartnerId, getDeviceInfo } from "@/lib/device-store";
import type { ChatMessage } from "@shared/schema";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
type Role = "controller" | "sharer";

interface RemoteCursor {
  x: number;
  y: number;
  clicking: boolean;
  visible: boolean;
}

interface RemoteKeyEvent {
  key: string;
  type: "keydown" | "keyup";
  timestamp: number;
}

export default function SessionPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [role, setRole] = useState<Role>("controller");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sessionTime, setSessionTime] = useState(0);
  const [remotePartnerId, setRemotePartnerId] = useState("");
  
  // Remote input guidance state
  const [remoteCursor, setRemoteCursor] = useState<RemoteCursor>({ x: 0, y: 0, clicking: false, visible: false });
  const [remoteKeys, setRemoteKeys] = useState<RemoteKeyEvent[]>([]);
  const [showRemoteInput, setShowRemoteInput] = useState(true);
  const [controlEnabled, setControlEnabled] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const device = getDeviceInfo();

  // Parse URL params and start connection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role") as Role || "controller";
    const targetParam = params.get("target") || "";
    const controllerParam = params.get("controller") || "";
    
    setRole(roleParam);
    
    if (roleParam === "controller") {
      setRemotePartnerId(targetParam);
    } else {
      setRemotePartnerId(controllerParam);
    }

    connectToSignaling(roleParam, targetParam, controllerParam);

    return () => {
      cleanup();
    };
  }, []);

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "connected") {
      interval = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const cleanup = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Handle incoming data channel messages (for receiving remote input events)
  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === "mouse-move" && showRemoteInput) {
        setRemoteCursor(prev => ({ ...prev, x: data.x, y: data.y, visible: true }));
      } else if (data.type === "mouse-click" && showRemoteInput) {
        setRemoteCursor(prev => ({ ...prev, clicking: true }));
        setTimeout(() => setRemoteCursor(prev => ({ ...prev, clicking: false })), 150);
      } else if (data.type === "mouse-leave") {
        setRemoteCursor(prev => ({ ...prev, visible: false }));
      } else if (data.type === "key-event" && showRemoteInput) {
        const keyEvent: RemoteKeyEvent = {
          key: data.key,
          type: data.eventType,
          timestamp: Date.now(),
        };
        setRemoteKeys(prev => [...prev.slice(-4), keyEvent]);
        // Clear old keys after 2 seconds
        setTimeout(() => {
          setRemoteKeys(prev => prev.filter(k => k.timestamp !== keyEvent.timestamp));
        }, 2000);
      } else if (data.type === "control-toggle") {
        setControlEnabled(data.enabled);
        toast({
          title: data.enabled ? "Remote control enabled" : "Remote control disabled",
          description: data.enabled 
            ? "You can now see remote pointer guidance" 
            : "Remote pointer guidance is disabled",
        });
      }
    } catch (e) {
      console.error("Error parsing data channel message:", e);
    }
  }, [showRemoteInput, toast]);

  // Send data channel message
  const sendDataChannelMessage = useCallback((data: any) => {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendSignal = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...message,
        from: device.partnerId,
      }));
    }
  }, [device.partnerId]);

  const createPeerConnection = useCallback((targetPartnerId: string, isInitiator: boolean) => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    const pc = new RTCPeerConnection(config);

    // Create data channel for input events (only initiator creates it)
    if (isInitiator) {
      const dc = pc.createDataChannel("input-control", { ordered: true });
      dc.onopen = () => console.log("Data channel open (initiator)");
      dc.onmessage = handleDataChannelMessage;
      dc.onerror = (e) => console.error("Data channel error:", e);
      dataChannelRef.current = dc;
    }

    // Handle incoming data channel (for non-initiator)
    pc.ondatachannel = (event) => {
      console.log("Received data channel");
      const dc = event.channel;
      dc.onopen = () => console.log("Data channel open (receiver)");
      dc.onmessage = handleDataChannelMessage;
      dc.onerror = (e) => console.error("Data channel error:", e);
      dataChannelRef.current = dc;
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "ice-candidate",
          to: targetPartnerId,
          payload: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        videoRef.current.play().catch(console.error);
      }
    };

    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case "connected":
          setStatus("connected");
          toast({
            title: "Connected",
            description: "Screen sharing session established",
          });
          break;
        case "disconnected":
        case "closed":
          setStatus("disconnected");
          break;
        case "failed":
          setStatus("error");
          break;
      }
    };

    return pc;
  }, [sendSignal, handleDataChannelMessage, toast]);

  const connectToSignaling = useCallback((
    roleParam: Role,
    targetParam: string,
    controllerParam: string
  ) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Join the signaling server
      sendSignal({
        type: "join",
        to: "server",
        payload: { name: device.name },
      });
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "joined":
          if (roleParam === "controller" && targetParam) {
            // Controller: tell target to start sharing
            sendSignal({
              type: "start-remote",
              to: targetParam,
            });
          } else if (roleParam === "sharer" && controllerParam) {
            // Sharer: start screen capture immediately
            await startScreenShare(controllerParam);
          }
          break;

        case "start-sharing":
          // We're the sharer - start screen capture
          await startScreenShare(message.from);
          break;

        case "offer":
          // Controller receives offer from sharer
          try {
            const pc = createPeerConnection(message.from, false);
            pcRef.current = pc;

            await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            sendSignal({
              type: "answer",
              to: message.from,
              payload: answer,
            });
          } catch (error) {
            console.error("Error handling offer:", error);
            setStatus("error");
          }
          break;

        case "answer":
          // Sharer receives answer from controller
          try {
            if (pcRef.current) {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(message.payload));
            }
          } catch (error) {
            console.error("Error handling answer:", error);
          }
          break;

        case "ice-candidate":
          try {
            if (pcRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(message.payload));
            }
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
          break;

        case "chat-message":
          setMessages((prev) => [...prev, message.payload]);
          break;

        case "session-ended":
          setStatus("disconnected");
          toast({
            title: "Session ended",
            description: "The remote session has been closed",
          });
          break;

        case "error":
          setStatus("error");
          toast({
            title: "Error",
            description: message.payload?.error || "Connection failed",
            variant: "destructive",
          });
          break;
      }
    };

    ws.onclose = () => {
      if (status === "connected") {
        setStatus("disconnected");
      }
    };

    ws.onerror = () => {
      setStatus("error");
      toast({
        title: "Connection error",
        description: "Failed to connect to signaling server",
        variant: "destructive",
      });
    };
  }, [device.name, sendSignal, createPeerConnection, toast, status]);

  const startScreenShare = async (targetPartnerId: string) => {
    try {
      // Request screen share - browser will show picker (security requirement)
      // preferCurrentTab: false hints to show monitor/window options first
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false,
        // @ts-ignore - preferCurrentTab is a newer API
        preferCurrentTab: false,
        // @ts-ignore - systemAudio might help on some browsers
        systemAudio: "exclude",
      } as DisplayMediaStreamOptions);

      localStreamRef.current = stream;

      // Handle user stopping share
      stream.getVideoTracks()[0].onended = () => {
        handleDisconnect();
      };

      // Sharer is the initiator (creates data channel)
      const pc = createPeerConnection(targetPartnerId, true);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal({
        type: "offer",
        to: targetPartnerId,
        payload: offer,
      });
    } catch (error) {
      const err = error as Error;
      if (err.name === "NotAllowedError") {
        toast({
          title: "Cancelled",
          description: "Screen sharing was cancelled",
          variant: "destructive",
        });
        setLocation("/");
      } else {
        setStatus("error");
        toast({
          title: "Error",
          description: "Failed to start screen sharing",
          variant: "destructive",
        });
      }
    }
  };

  const handleDisconnect = () => {
    if (remotePartnerId) {
      sendSignal({
        type: "end-session",
        to: remotePartnerId,
      });
    }
    cleanup();
    setLocation("/");
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !remotePartnerId) return;

    const chatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId: "current",
      senderId: device.partnerId,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    sendSignal({
      type: "chat-message",
      to: remotePartnerId,
      payload: chatMessage,
    });

    setMessages((prev) => [...prev, chatMessage]);
    setNewMessage("");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Mouse event handlers for controller
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (role !== "controller" || !controlEnabled) return;
    
    const container = videoContainerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const rect = container.getBoundingClientRect();
    // Calculate relative position (0-1)
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    sendDataChannelMessage({ type: "mouse-move", x, y });
  }, [role, controlEnabled, sendDataChannelMessage]);

  const handleMouseClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (role !== "controller" || !controlEnabled) return;
    
    const container = videoContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    sendDataChannelMessage({ type: "mouse-click", x, y, button: e.button });
  }, [role, controlEnabled, sendDataChannelMessage]);

  const handleMouseLeave = useCallback(() => {
    if (role !== "controller") return;
    sendDataChannelMessage({ type: "mouse-leave" });
  }, [role, sendDataChannelMessage]);

  // Keyboard event handlers for controller
  useEffect(() => {
    if (role !== "controller" || status !== "connected" || !controlEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if typing in chat
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      
      sendDataChannelMessage({ 
        type: "key-event", 
        key: e.key, 
        eventType: "keydown",
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      
      sendDataChannelMessage({ 
        type: "key-event", 
        key: e.key, 
        eventType: "keyup",
        code: e.code,
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [role, status, controlEnabled, sendDataChannelMessage]);

  // Toggle control enabled (sharer can disable)
  const toggleControlEnabled = useCallback(() => {
    const newEnabled = !controlEnabled;
    setControlEnabled(newEnabled);
    if (!newEnabled) {
      setRemoteCursor({ x: 0, y: 0, visible: false, clicking: false });
      setRemoteKeys([]);
    }
    sendDataChannelMessage({ type: "control-toggle", enabled: newEnabled });
    toast({
      title: newEnabled ? "Remote guidance enabled" : "Remote guidance disabled",
      description: newEnabled 
        ? "Remote user can now guide you with pointer" 
        : "Remote user's pointer guidance is hidden",
    });
  }, [controlEnabled, sendDataChannelMessage, toast]);

  // Connecting state UI
  if (status === "connecting") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Setting up connection...
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            {role === "controller" ? (
              <p>Waiting for remote device to share their screen...</p>
            ) : (
              <p>Starting screen share...</p>
            )}
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setLocation("/")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state UI
  if (status === "error" || status === "disconnected") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">
              {status === "error" ? "Connection Failed" : "Disconnected"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              {status === "error"
                ? "Could not establish a connection with the remote device."
                : "The remote session has ended."}
            </p>
            <Button onClick={() => setLocation("/")} data-testid="button-back-home">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected state UI
  return (
    <div ref={containerRef} className="flex flex-1 flex-col bg-black">
      {/* Video container */}
      <div 
        ref={videoContainerRef}
        className="relative flex-1"
        onMouseMove={handleMouseMove}
        onClick={handleMouseClick}
        onMouseLeave={handleMouseLeave}
      >
        {role === "controller" ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-contain"
            data-testid="video-remote-screen"
            onLoadedMetadata={() => console.log("Video metadata loaded")}
            onPlay={() => console.log("Video playing")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center text-white">
              <Monitor className="mx-auto h-16 w-16 mb-4 opacity-50" />
              <p className="text-xl">Sharing your screen...</p>
              <p className="text-sm opacity-70 mt-2">
                {formatPartnerId(remotePartnerId)} is viewing
              </p>
            </div>
          </div>
        )}

        {/* Remote cursor overlay for sharer - uses viewport coordinates */}
        {role === "sharer" && showRemoteInput && controlEnabled && remoteCursor.visible && (
          <div 
            className="fixed pointer-events-none z-[9999] transition-all duration-75"
            style={{ 
              left: `${remoteCursor.x * window.innerWidth}px`, 
              top: `${remoteCursor.y * window.innerHeight}px`,
            }}
          >
            <div className={`flex items-center gap-1 ${remoteCursor.clicking ? 'scale-90' : ''} transition-transform`}>
              <MousePointer2 
                className={`h-6 w-6 drop-shadow-lg ${remoteCursor.clicking ? 'text-yellow-400' : 'text-blue-500'}`} 
                style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }}
              />
              <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded shadow-lg">
                Remote
              </span>
            </div>
          </div>
        )}

        {/* Remote keyboard indicator for sharer */}
        {role === "sharer" && showRemoteInput && controlEnabled && remoteKeys.length > 0 && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 bg-background/90 backdrop-blur border rounded-lg p-2 shadow-lg">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              {remoteKeys.map((k, i) => (
                <Badge key={i} variant="secondary" className="font-mono text-xs">
                  {k.key.length === 1 ? k.key.toUpperCase() : k.key}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Control bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-green-500/20 text-green-400">
              <Wifi className="mr-1 h-3 w-3" />
              Connected
            </Badge>
            <Badge variant="secondary">
              <Clock className="mr-1 h-3 w-3" />
              {formatTime(sessionTime)}
            </Badge>
            <span className="text-sm text-white/70">
              {role === "controller" ? "Viewing" : "Sharing to"}: {formatPartnerId(remotePartnerId)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Remote input toggle - for sharer to hide/show remote pointer */}
            {role === "sharer" && (
              <Button
                size="icon"
                variant="ghost"
                className={`text-white hover:bg-white/20 ${!showRemoteInput ? 'opacity-50' : ''}`}
                onClick={() => setShowRemoteInput(!showRemoteInput)}
                title={showRemoteInput ? "Hide remote pointer" : "Show remote pointer"}
                data-testid="button-toggle-remote-input"
              >
                {showRemoteInput ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </Button>
            )}
            
            {/* Control enabled toggle - for sharer to enable/disable remote control */}
            {role === "sharer" && (
              <Button
                size="icon"
                variant="ghost"
                className={`text-white hover:bg-white/20 ${!controlEnabled ? 'opacity-50' : ''}`}
                onClick={toggleControlEnabled}
                title={controlEnabled ? "Disable remote guidance" : "Enable remote guidance"}
                data-testid="button-toggle-control"
              >
                <MousePointer2 className={`h-5 w-5 ${!controlEnabled ? 'line-through' : ''}`} />
              </Button>
            )}

            {/* Guidance indicator for controller */}
            {role === "controller" && (
              <Badge 
                variant="secondary" 
                className={controlEnabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}
              >
                <MousePointer2 className="mr-1 h-3 w-3" />
                {controlEnabled ? "Guidance Active" : "Guidance Disabled"}
              </Badge>
            )}
            
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => setChatOpen(!chatOpen)}
              data-testid="button-toggle-chat"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={toggleFullscreen}
              data-testid="button-fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="destructive"
              onClick={handleDisconnect}
              data-testid="button-disconnect"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="absolute right-4 top-4 bottom-20 w-80 flex flex-col rounded-lg bg-background border shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <h3 className="font-semibold">Chat</h3>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setChatOpen(false)}
              data-testid="button-close-chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg p-2 text-sm ${
                    msg.senderId === device.partnerId
                      ? "ml-8 bg-primary text-primary-foreground"
                      : "mr-8 bg-muted"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2 border-t p-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              data-testid="input-chat-message"
            />
            <Button size="icon" onClick={handleSendMessage} data-testid="button-send-message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
