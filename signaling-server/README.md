# 🔌 Signaling Server - VideoChat (Node.js + Socket.IO)

Servidor Node.js responsável por intermediar a troca de mensagens **SDP (offer/answer)** e **ICE candidates** entre dois navegadores.

---

## 🚀 Tecnologias

- Node.js
- Express
- Socket.IO
- HTTPS

---

## ▶️ Como executar

```bash
npm install
npm start
```

Servidor padrão: https://localhost:3001

---

## 📡 Eventos Socket.IO

| Evento          | Função                                |
| --------------- | ------------------------------------- |
| `join`          | Cliente entra na sala                 |
| `ready`         | Notifica que há dois peers conectados |
| `offer`         | Envia SDP do chamador                 |
| `answer`        | Envia SDP do receptor                 |
| `ice-candidate` | Troca candidatos ICE                  |
| `peer-left`     | Notifica saída do peer                |

---

## 🧠 Autor

Desenvolvido por **Lorival Warmeling Matias**
