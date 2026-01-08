import { useState, useEffect, useRef, useCallback } from "react";
import { getDeviceInfo } from "@/lib/device-store";

type ConnectionStatus = "idle" | "connecting" | "waiting" | "connected" | "disconnected" | "error";

interface WebRTCState {
  status: ConnectionStatus;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
}

interface SignalingMessage {
  type: string;
  from: string;
  to: string;
  payload?: any;
}

export function useWebRTC(partnerId: string | null) {
  const [state, setState] = useState<WebRTCState>({
    status: "idle",
    localStream: null,
    remoteStream: null,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const device = getDeviceInfo();

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (state.localStream) {
      state.localStream.getTracks().forEach((track) => track.stop());
    }
  }, [state.localStream]);

  const sendSignal = useCallback((message: Omit<SignalingMessage, "from">) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...message,
        from: device.partnerId,
      }));
    }
  }, [device.partnerId]);

  const createPeerConnection = useCallback(() => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate && partnerId) {
        sendSignal({
          type: "ice-candidate",
          to: partnerId,
          payload: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setState((prev) => ({
        ...prev,
        remoteStream: event.streams[0],
      }));
    };

    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case "connected":
          setState((prev) => ({ ...prev, status: "connected" }));
          break;
        case "disconnected":
        case "closed":
          setState((prev) => ({ ...prev, status: "disconnected" }));
          break;
        case "failed":
          setState((prev) => ({ ...prev, status: "error", error: "Connection failed" }));
          break;
      }
    };

    return pc;
  }, [partnerId, sendSignal]);

  const startConnection = useCallback(async () => {
    if (!partnerId) return;

    setState((prev) => ({ ...prev, status: "connecting" }));

    // Connect to WebSocket signaling server
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      sendSignal({
        type: "join",
        to: "server",
        payload: { name: device.name },
      });
    };

    ws.onmessage = async (event) => {
      const message: SignalingMessage = JSON.parse(event.data);

      switch (message.type) {
        case "joined":
          // Request connection to partner
          sendSignal({
            type: "request-connection",
            to: partnerId,
          });
          setState((prev) => ({ ...prev, status: "waiting" }));
          break;

        case "connection-accepted":
          // Partner accepted, create offer
          try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
              video: { displaySurface: "monitor" },
              audio: false,
            });

            setState((prev) => ({ ...prev, localStream: stream }));

            const pc = createPeerConnection();
            pcRef.current = pc;

            stream.getTracks().forEach((track) => {
              pc.addTrack(track, stream);
            });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            sendSignal({
              type: "offer",
              to: partnerId,
              payload: offer,
            });
          } catch (error) {
            const err = error as Error;
            if (err.name === "NotAllowedError") {
              setState((prev) => ({ 
                ...prev, 
                status: "idle",
                error: "Screen sharing was cancelled" 
              }));
            } else {
              setState((prev) => ({ 
                ...prev, 
                status: "error",
                error: "Failed to start screen sharing" 
              }));
            }
          }
          break;

        case "connection-rejected":
          setState((prev) => ({ 
            ...prev, 
            status: "error",
            error: "Connection was rejected" 
          }));
          break;

        case "error":
          setState((prev) => ({ 
            ...prev, 
            status: "error",
            error: message.payload?.error || "Connection error" 
          }));
          break;

        case "offer":
          // Received offer, create answer (for host role)
          try {
            const pc = createPeerConnection();
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
          }
          break;

        case "answer":
          // Received answer
          try {
            if (pcRef.current) {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(message.payload));
            }
          } catch (error) {
            console.error("Error handling answer:", error);
          }
          break;

        case "ice-candidate":
          // Received ICE candidate
          try {
            if (pcRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(message.payload));
            }
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
          break;
      }
    };

    ws.onclose = () => {
      if (state.status !== "idle" && state.status !== "disconnected") {
        setState((prev) => ({ ...prev, status: "disconnected" }));
      }
    };

    ws.onerror = () => {
      setState((prev) => ({ 
        ...prev, 
        status: "error",
        error: "WebSocket connection failed" 
      }));
    };
  }, [partnerId, device.name, sendSignal, createPeerConnection, state.status]);

  const disconnect = useCallback(() => {
    sendSignal({
      type: "leave",
      to: "server",
    });
    cleanup();
    wsRef.current?.close();
    setState({
      status: "disconnected",
      localStream: null,
      remoteStream: null,
      error: null,
    });
  }, [sendSignal, cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
      wsRef.current?.close();
    };
  }, [cleanup]);

  return {
    ...state,
    startConnection,
    disconnect,
    sendSignal,
  };
}
