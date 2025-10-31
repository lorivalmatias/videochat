import { io } from "socket.io-client";

let socket: Socket | null = null;

export function connectSignaling(serverUrl: string): Socket {
  if (!socket) {
    socket = io(serverUrl, {
      autoConnect: true,
      transports: ["websocket", "polling"], // fallback
      rejectUnauthorized: false, // importante para aceitar certificado self-signed
    });

    socket.on("connect_error", (err) => {
      console.error("[signaling] connect_error:", err);
    });

    socket.on("connect", () => {
      console.log("[signaling] conectado com id", socket?.id);
    });
  }
  return socket;
}
