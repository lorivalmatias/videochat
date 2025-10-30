import React, { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { connectSignaling } from "./signaling";

type Props = {
  roomId: string;
  signalingUrl: string; // ex: "http://localhost:3001"
};

const iceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" }, // STUN público básico
];

export default function VideoCall({ roomId, signalingUrl }: Props) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [joined, setJoined] = useState(false);
  const [isCaller, setIsCaller] = useState(false);

  // 1. inicializa câmera/microfone e WebRTC peer connection
  useEffect(() => {
    async function init() {
      // pega câmera e microfone
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // mostra vídeo local
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // cria RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      // envia trilhas locais (áudio e vídeo) pro peer
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // quando chegar mídia remota do outro peer
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      // cada ICE candidate encontrado localmente -> mandar via signaling
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("ice-candidate", {
            roomId,
            candidate: event.candidate,
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("ICE state:", pc.iceConnectionState);
      };

      // conecta ao servidor de sinalização
      const socket = connectSignaling(signalingUrl);
      socketRef.current = socket;

      // quando conectar no signaling, entrar na sala
      socket.emit("join", roomId);

      // resposta do servidor dizendo se você é o primeiro (caller) ou o segundo (callee)
      socket.on(
        "joined",
        async ({ isCaller: callerFlag }: { isCaller: boolean }) => {
          setJoined(true);
          setIsCaller(callerFlag);
          if (callerFlag) {
            // você inicia a oferta SDP
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit("offer", { roomId, sdp: offer });
          }
        }
      );

      // receber oferta SDP (quando você é o callee)
      socket.on("offer", async ({ sdp }) => {
        if (!pcRef.current) return;
        console.log("[callee] Recebi offer");
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );

        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);

        socket.emit("answer", { roomId, sdp: answer });
      });

      // receber resposta SDP (quando você é o caller)
      socket.on("answer", async ({ sdp }) => {
        if (!pcRef.current) return;
        console.log("[caller] Recebi answer");
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
      });

      // receber ICE candidate remoto
      socket.on("ice-candidate", async ({ candidate }) => {
        try {
          if (pcRef.current) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (err) {
          console.error("Erro ao adicionar ICE candidate remoto:", err);
        }
      });

      // peer remoto saiu
      socket.on("peer-left", () => {
        if (remoteVideoRef.current) {
          (remoteVideoRef.current.srcObject as MediaStream | null)
            ?.getTracks()
            .forEach((t) => t.stop());
          remoteVideoRef.current.srcObject = null;
        }
      });
    }

    init();

    // cleanup ao desmontar componente
    return () => {
      // fecha conexão WebRTC
      if (pcRef.current) {
        pcRef.current.getSenders().forEach((sender) => {
          try {
            sender.track?.stop();
            // eslint-disable-next-line no-empty, @typescript-eslint/no-unused-vars
          } catch (_) {}
        });
        pcRef.current.close();
      }

      // para mídia local
      if (localVideoRef.current?.srcObject) {
        (localVideoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }

      // avisa servidor que saiu
      if (socketRef.current) {
        socketRef.current.emit("leave", roomId);
        socketRef.current.disconnect();
      }
    };
  }, [roomId, signalingUrl]);

  return (
    <div className="videocall-container" style={styles.container}>
      <h2 style={styles.title}>
        Sala: {roomId}{" "}
        {joined ? (isCaller ? "(Chamador)" : "(Receptor)") : "(Conectando...)"}
      </h2>

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
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            style={styles.video}
          />
        </div>
      </div>
    </div>
  );
}

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
