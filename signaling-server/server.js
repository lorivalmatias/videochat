import express from "express";
import fs from "fs";
import https from "https";
import path from "path";
import { Server } from "socket.io";

const app = express();

// lê o certificado gerado pelo mkcert
const keyPath = path.resolve("../frontend/localhost+2-key.pem");
const certPath = path.resolve("../frontend/localhost+2.pem");

const httpsServer = https.createServer(
  {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  },
  app
);

// configura Socket.IO com CORS liberado para o frontend
const io = new Server(httpsServer, {
  cors: {
    origin: "*",
  },
});

// mapa de salas (roomId -> sockets)
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("join", (roomId) => {
    let peers = rooms.get(roomId) || [];
    if (!peers.includes(socket.id)) {
      peers.push(socket.id);
      rooms.set(roomId, peers);
    }

    socket.join(roomId);

    const isCaller = peers.length === 1;
    socket.emit("joined", { isCaller });

    console.log(
      `Socket ${socket.id} entrou na sala ${roomId}. Peers: ${peers.length}`
    );
  });

  socket.on("offer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("offer", { sdp });
  });

  socket.on("answer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("answer", { sdp });
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", { candidate });
  });

  socket.on("leave", (roomId) => {
    leaveRoom(socket, roomId);
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
    for (const [roomId] of rooms.entries()) {
      leaveRoom(socket, roomId, { silentIfNotInRoom: true });
    }
  });
});

function leaveRoom(socket, roomId, opts = {}) {
  const { silentIfNotInRoom } = opts;
  let peers = rooms.get(roomId) || [];
  if (!peers.includes(socket.id)) {
    if (!silentIfNotInRoom) {
      console.log(
        `Socket ${socket.id} tentou sair da sala ${roomId}, mas não estava nela.`
      );
    }
    return;
  }

  peers = peers.filter((id) => id !== socket.id);
  rooms.set(roomId, peers);
  socket.leave(roomId);
  socket.to(roomId).emit("peer-left", { socketId: socket.id });

  console.log(
    `Socket ${socket.id} saiu da sala ${roomId}. Peers restantes: ${peers.length}`
  );

  if (peers.length === 0) {
    rooms.delete(roomId);
  }
}

const PORT = 3001;
httpsServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor HTTPS rodando em https://192.168.0.109:${PORT}`);
});
