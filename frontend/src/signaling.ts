import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSignaling(serverUrl: string): Socket {
  if (!socket) {
    socket = io(serverUrl, {
      autoConnect: true,
    });
  }
  return socket;
}
