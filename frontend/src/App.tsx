import React, { useState } from "react";
import VideoCall from "./VideoCall";

export default function App() {
  const [roomId, setRoomId] = useState("sala-teste-123");
  const [join, setJoin] = useState(false);

  return (
    <div style={pageStyle}>
      {!join ? (
        <div style={cardStyle}>
          <h1 style={{ marginBottom: "1rem" }}>Video Call Demo</h1>

          <label style={labelStyle}>
            ID da Sala:
            <input
              style={inputStyle}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
          </label>

          <button style={buttonStyle} onClick={() => setJoin(true)}>
            Entrar na sala
          </button>
        </div>
      ) : (
        <VideoCall roomId={roomId} signalingUrl="https://192.168.0.109:3001" />
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  backgroundColor: "#0f0f0f",
  minHeight: "100vh",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "sans-serif",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#1f1f1f",
  padding: "2rem",
  borderRadius: "1rem",
  display: "flex",
  flexDirection: "column",
  minWidth: "320px",
};

const labelStyle: React.CSSProperties = {
  fontSize: ".9rem",
  display: "flex",
  flexDirection: "column",
  marginBottom: "1rem",
};

const inputStyle: React.CSSProperties = {
  backgroundColor: "#2a2a2a",
  border: "1px solid #444",
  color: "#fff",
  borderRadius: ".5rem",
  padding: ".5rem .75rem",
  fontSize: "1rem",
  marginTop: ".5rem",
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#4f46e5",
  color: "#fff",
  padding: ".75rem 1rem",
  fontSize: "1rem",
  fontWeight: 600,
  border: "0",
  borderRadius: ".5rem",
  cursor: "pointer",
};
