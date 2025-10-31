# 🎥 Frontend - VideoChat (React + TypeScript + Vite)

Interface Web que implementa a chamada de vídeo ponto a ponto utilizando **WebRTC** com **Socket.IO** como servidor de sinalização.

---

## 🚀 Tecnologias Principais

- React 18 + TypeScript
- Vite
- Socket.IO Client
- TailwindCSS
- WebRTC API

---

## ▶️ Como executar

```bash
npm install
npm run dev
```

Depois acesse no navegador: https://localhost:5173

---

## 🧩 Funcionamento

- Acessa câmera/microfone via `getUserMedia()`
- Cria `RTCPeerConnection`
- Troca `offer`, `answer` e `ice-candidate` via Socket.IO
- Exibe vídeo local e remoto

---

## ⚙️ Estrutura

```
frontend/
 ├── src/
 │   ├── components/VideoCall.tsx
 │   ├── signaling.ts
 │   ├── App.tsx, main.tsx
 │   ├── index.css, style.css
 ├── vite.config.ts
 └── package.json
```
