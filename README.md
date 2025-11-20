# 🎥 VideoChat - WebRTC + Socket.IO

Versão BETA de um sistema de **chamada de vídeo P2P** desenvolvido com **WebRTC**, **React + TypeScript** no frontend e **Node.js + Socket.IO** como servidor de sinalização.

Permite conexão de vídeo **direta entre dois navegadores** (PC, celular, tablet), utilizando **HTTPS** e comunicação em tempo real para troca de `offer`, `answer` e `ICE candidates`.

---

## 🧩 Estrutura do Projeto

```
videochat/
├── frontend/               # Interface do usuário (React + Vite + Tailwind)
│   ├── src/
│   │   └── components/VideoCall.tsx
│   └── vite.config.ts
│
├── signaling-server/       # Servidor Node.js para sinalização WebRTC
│   └── server.js
│
├── .gitignore
└── README.md               # Este arquivo
```

---

## 🚀 Tecnologias

### Frontend

- React 18 + TypeScript
- Vite
- TailwindCSS
- Socket.IO Client
- WebRTC API

### Backend (Signaling)

- Node.js
- Express
- Socket.IO
- HTTPS

---

## ▶️ Como executar localmente

### 1️⃣ Iniciar o servidor de sinalização

```bash
cd signaling-server
npm install
npm start
```

Depois acesse: https://192.168.0.109:3001

### 2️⃣ Iniciar o frontend

```bash
cd ../frontend
npm install
npm run dev
```

Depois acesse: https://192.168.0.109:5173

---

## 📱 Layout Responsivo

- **Desktop:** vídeos lado a lado.
- **Mobile:** vídeos empilhados verticalmente ou lado a lado na horizontal.

---

## 🧠 Autor

Desenvolvido por **Lorival Warmeling Matias**
