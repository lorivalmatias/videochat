// server.js — Servidor de sinalização WebRTC com reconexão inteligente
import colors from "colors";
import express from "express";
import fs from "fs";
import https from "https";
import { Server } from "socket.io";

// === Configurações HTTPS ===
const options = {
  key: fs.readFileSync("../frontend/localhost+2-key.pem"),
  cert: fs.readFileSync("../frontend/localhost+2.pem"),
};

const app = express();
const server = https.createServer(options, app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const PORT = 3001;

// Armazena as conexões por sala
// rooms: { roomId: Set(socketIds) }
const rooms = {};

io.on("connection", (socket) => {
  console.log(colors.green(`[+] Cliente conectado: ${socket.id}`));

  // === JOIN ===
  socket.on("join", (roomId) => {
    console.log(colors.cyan(`[join] ${socket.id} entrou na sala ${roomId}`));

    if (!rooms[roomId]) {
      rooms[roomId] = new Set();
    }

    const peers = rooms[roomId];

    // Limita para 2 peers por sala
    if (peers.size >= 2) {
      console.warn(
        colors.red(`[join] Sala ${roomId} cheia — recusando ${socket.id}`)
      );
      socket.emit("room-full", { roomId });
      return;
    }

    peers.add(socket.id);
    socket.join(roomId);

    const isCaller = peers.size === 1;
    socket.emit("joined", { isCaller });
    console.log(
      colors.yellow(
        `[info] Sala ${roomId} possui ${peers.size} peer(s). Chamador? ${isCaller}`
      )
    );

    // 🔹 Quando há 2 peers → sala pronta
    if (peers.size === 2) {
      console.log(
        colors.magenta(
          `[ready] Sala ${roomId} está pronta — emitindo evento "ready"`
        )
      );
      io.to(roomId).emit("ready", { roomId });
    }
  });

  // === LEAVE ===
  socket.on("leave", (roomId) => {
    console.log(colors.gray(`[leave] ${socket.id} saiu da sala ${roomId}`));
    handleLeave(socket, roomId);
  });

  // === DISCONNECT ===
  socket.on("disconnect", () => {
    console.log(colors.red(`[disconnect] ${socket.id}`));

    for (const [roomId, peers] of Object.entries(rooms)) {
      if (peers.has(socket.id)) {
        handleLeave(socket, roomId);
      }
    }
  });

  // === OFFER ===
  socket.on("offer", ({ roomId, sdp }) => {
    console.log(colors.blue(`[offer] ${socket.id} → sala ${roomId}`));
    socket.to(roomId).emit("offer", { sdp });
  });

  // === ANSWER ===
  socket.on("answer", ({ roomId, sdp }) => {
    console.log(colors.blue(`[answer] ${socket.id} → sala ${roomId}`));
    socket.to(roomId).emit("answer", { sdp });
  });

  // === ICE ===
  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", { candidate });
  });
});

// === Função de saída ===
function handleLeave(socket, roomId) {
  const peers = rooms[roomId];
  if (!peers) return;

  peers.delete(socket.id);
  socket.leave(roomId);
  console.log(colors.gray(`[peer-left] ${socket.id} saiu da sala ${roomId}`));

  // Notifica quem ficou
  socket.to(roomId).emit("peer-left", { socketId: socket.id });

  if (peers.size === 1) {
    // 🔹 Reenvia "ready" para o peer remanescente — reconexão automática
    const [remaining] = Array.from(peers);
    console.log(
      colors.yellow(
        `[reconnect] Sala ${roomId} tem 1 peer — reenviando 'ready' para ${remaining}`
      )
    );
    io.to(remaining).emit("ready", { roomId });
  }

  if (peers.size === 0) {
    console.log(colors.gray(`[cleanup] Sala ${roomId} esvaziada — removendo`));
    delete rooms[roomId];
  }
}

server.listen(PORT, () => {
  console.log(
    colors.green(`🚀 Servidor HTTPS rodando em https://192.168.0.109:${PORT}`)
  );
});
