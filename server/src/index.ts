import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { AccessToken } from "livekit-server-sdk";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

type ChatMessage = {
  id: string;
  roomId: string;
  name: string;
  message: string;
  ts: number;
};

io.on("connection", (socket) => {
  socket.on("room:join", ({ roomId, name }: { roomId: string; name: string }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.name = name;

    socket.to(roomId).emit("room:system", {
      id: cryptoRandomId(),
      roomId,
      name: "system",
      message: `${name} joined`,
      ts: Date.now(),
    } satisfies ChatMessage);
  });

  socket.on("chat:send", (payload: { roomId: string; name: string; message: string }) => {
    const msg: ChatMessage = {
      id: cryptoRandomId(),
      roomId: payload.roomId,
      name: payload.name,
      message: payload.message,
      ts: Date.now(),
    };
    // TEMPORARY: broadcast only, no DB
    io.to(payload.roomId).emit("chat:message", msg);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId as string | undefined;
    const name = socket.data.name as string | undefined;
    if (roomId && name) {
      socket.to(roomId).emit("room:system", {
        id: cryptoRandomId(),
        roomId,
        name: "system",
        message: `${name} left`,
        ts: Date.now(),
      } satisfies ChatMessage);
    }
  });
});

// LiveKit token endpoint
app.post("/api/livekit/token", async (req, res) => {
  const { roomId, name } = req.body as { roomId?: string; name?: string };

  if (!roomId || !name) {
    return res.status(400).json({ error: "roomId and name are required" });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    return res.status(500).json({ error: "LiveKit env vars missing" });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: name,
  });

  at.addGrant({
    room: roomId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();

  res.json({
    token,
    livekitUrl,
  });
});

function cryptoRandomId() {
  // Node 18+ has global crypto
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

const port = Number(process.env.PORT || 4000);
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
