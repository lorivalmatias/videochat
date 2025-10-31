import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SIGNALING_URL =
  window.location.protocol === "https:"
    ? "https://192.168.0.109:3001"
    : "http://192.168.0.109:3001";

const ROOM_ID = "sala-teste-123";

const VideoCall: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const joinedRef = useRef(false);
  const offerCreatedRef = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const [status, setStatus] = useState<"idle" | "waiting" | "connected">(
    "idle"
  );

  // ===============================================
  // 🧱 Criação do PeerConnection
  // ===============================================
  function createPeerConnection() {
    console.log("[webrtc] criando novo RTCPeerConnection...");

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[ice] enviando candidate local:", event.candidate);
        socketRef.current?.emit("ice-candidate", {
          roomId: ROOM_ID,
          candidate: event.candidate,
        });
      } else {
        console.log("[ice] fim dos candidates locais.");
      }
    };

    pc.ontrack = (event) => {
      console.log("[webrtc] ontrack recebido! streams:", event.streams);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[webrtc] ICE state mudou:", pc.iceConnectionState);
      if (pc.iceConnectionState === "connected") setStatus("connected");
      if (pc.iceConnectionState === "disconnected") setStatus("waiting");
    };

    pc.onsignalingstatechange = () => {
      console.log("[webrtc] signalingState mudou:", pc.signalingState);
    };

    pcRef.current = pc;
    return pc;
  }

  // ===============================================
  // 📞 Inicializa mídia local e socket
  // ===============================================
  async function init() {
    console.log("[init] começando setup WebRTC...");

    if (localStreamRef.current) {
      console.log("[init] já inicializado, ignorando duplicata.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log("[init] getUserMedia OK:", stream);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      createPeerConnection();
      stream
        .getTracks()
        .forEach((track) => pcRef.current?.addTrack(track, stream));
      console.log("[webrtc] Tracks locais adicionadas:", stream.getTracks());

      connectSignaling();
    } catch (err) {
      console.error("[init] erro ao capturar mídia:", err);
    }
  }

  // ===============================================
  // 🔌 Conecta ao servidor de sinalização
  // ===============================================
  function connectSignaling() {
    const socket = io(SIGNALING_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[signaling] conectado com id", socket.id);
      if (!joinedRef.current) {
        console.log("[signal] entrando na sala:", ROOM_ID);
        socket.emit("join", ROOM_ID);
        joinedRef.current = true;
      }
    });

    socket.on("connect_error", (err) => {
      console.error("[signaling] connect_error:", err);
    });

    socket.on("joined", ({ isCaller }: { isCaller: boolean }) => {
      console.log("[signal] joined sala:", ROOM_ID, "isCaller?", isCaller);
      setStatus("waiting");
    });

    // === READY ===
    socket.on("ready", async () => {
      console.log("[signal] recebi evento 'ready' da sala:", ROOM_ID);
      if (!pcRef.current) createPeerConnection();

      const pc = pcRef.current!;
      if (!offerCreatedRef.current) {
        offerCreatedRef.current = true;
        console.log("[signal] sala pronta, criando offer...");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { roomId: ROOM_ID, sdp: offer });
        console.log("[signal] offer criada e enviada!");
      }
    });

    // === OFFER ===
    socket.on("offer", async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      console.log("[signal] recebi offer:", sdp);
      const pc = pcRef.current ?? createPeerConnection();

      // ✅ Adicionar tracks locais (se ainda não foram adicionadas)
      if (localStreamRef.current) {
        const localTracks = localStreamRef.current.getTracks();
        const senders = pc.getSenders();
        localTracks.forEach((track) => {
          const alreadyAdded = senders.some((s) => s.track === track);
          if (!alreadyAdded) {
            pc.addTrack(track, localStreamRef.current!);
            console.log(
              "[webrtc] Track local adicionada no receptor:",
              track.kind
            );
          }
        });
      }

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { roomId: ROOM_ID, sdp: answer });
      console.log("[signal] answer criada e enviada!");
    });

    // === ANSWER ===
    socket.on("answer", async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      console.log("[signal] recebi answer:", sdp);
      const pc = pcRef.current;
      if (!pc) return;

      if (pc.signalingState === "stable") {
        console.log("[signal] já em estado estável, ignorando novo answer");
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log("[signal] setRemoteDescription(answer) OK");

        // adiciona candidatos que chegaram antes
        for (const candidate of pendingCandidatesRef.current) {
          try {
            await pc.addIceCandidate(candidate);
            console.log("[ice] addIceCandidate pendente OK");
          } catch (err) {
            console.warn("[ice] erro addIceCandidate pendente:", err);
          }
        }
        pendingCandidatesRef.current = [];
      } catch (err) {
        console.error("[signal] erro processando answer:", err);
      }
    });

    // === ICE ===
    socket.on("ice-candidate", async ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc) return;

      console.log("[ice] candidate remoto recebido:", candidate);
      if (!pc.remoteDescription) {
        console.log("[ice] aguardando setRemoteDescription...");
        pendingCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("[ice] addIceCandidate OK");
      } catch (err) {
        console.error("[ice] erro ao adicionar candidate remoto:", err);
      }
    });

    // === PEER LEFT ===
    socket.on("peer-left", ({ socketId }: { socketId: string }) => {
      console.log("[signal] peer-left:", socketId);

      if (remoteVideoRef.current) {
        const stream = remoteVideoRef.current.srcObject as MediaStream | null;
        stream?.getTracks().forEach((t) => t.stop());
        remoteVideoRef.current.srcObject = null;
      }

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      console.log("[signal] recriando RTCPeerConnection após saída do peer...");
      createPeerConnection();

      offerCreatedRef.current = false;
      setStatus("waiting");
    });
  }

  // ===============================================
  // 🧹 Cleanup
  // ===============================================
  useEffect(() => {
    init();
    return () => {
      console.log("[cleanup] desmontando componente VideoCall");
      socketRef.current?.disconnect();
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ===============================================
  // 🖥️ Render
  // ===============================================
  return (
    <div style={styles.videosWrapper}>
      <div style={styles.videoBlock}>
        <span style={styles.label}>Você</span>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={styles.video}
        />
      </div>

      <div style={styles.videoBlock}>
        <span style={styles.label}>Remoto</span>
        <video ref={remoteVideoRef} autoPlay playsInline style={styles.video} />
      </div>
    </div>
  );
};

// estilos inline simples só pra organizar a tela
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    color: "#fff",
    backgroundColor: "#1e1e1e",
    minHeight: "100vh",
    padding: "1.5rem",
    fontFamily: "sans-serif",
  },
  title: {
    fontSize: "1rem",
    fontWeight: 500,
  },
  videosWrapper: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
  },
  videoBlock: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#2a2a2a",
    borderRadius: "0.75rem",
    padding: "0.75rem",
    minWidth: "300px",
  },
  label: {
    fontSize: ".8rem",
    marginBottom: ".5rem",
    opacity: 0.8,
  },
  video: {
    width: "320px",
    height: "240px",
    backgroundColor: "#000",
    borderRadius: "0.5rem",
    objectFit: "cover",
  },
};

export default VideoCall;
