import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

type ChatMessage = {
  id: string;
  roomId: string;
  name: string;
  message: string;
  ts: number;
};

const SERVER_URL = import.meta.env.VITE_SERVER_URL as string;

// ─── Inner video grid ──────────────────────────────────────────────────────────
function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <GridLayout tracks={tracks} style={{ height: "100%" }}>
      <ParticipantTile />
    </GridLayout>
  );
}

// ─── Connecting spinner ────────────────────────────────────────────────────────
function ConnectingState() {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    }}>
      <div style={{
        width: 52,
        height: 52,
        borderRadius: "50%",
        border: "3px solid rgba(139,92,246,0.2)",
        borderTopColor: "#8b5cf6",
        animation: "spin 0.9s linear infinite",
      }} />
      <div style={{
        fontSize: 15,
        color: "rgba(241,245,249,0.5)",
        animation: "pulse-ring 1.8s ease-in-out infinite",
      }}>
        Connecting to room…
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function RoomPage() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const location = useLocation();

  const nameFromState = (location.state as any)?.name as string | undefined;

  const [name, setName] = useState(nameFromState ?? "");
  const [token, setToken] = useState<string>("");
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [socket, setSocket] = useState<Socket | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const room = roomId ?? "";

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Name prompt on refresh
  useEffect(() => {
    if (!room) return;
    if (!name.trim()) {
      const n = prompt("Enter your name") ?? "";
      if (!n.trim()) nav("/", { replace: true });
      else setName(n.trim());
    }
  }, [room, name, nav]);

  // Fetch LiveKit token
  useEffect(() => {
    if (!room || !name.trim()) return;

    (async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/livekit/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: room, name }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(err.error || "Failed to get token");
          nav("/", { replace: true });
          return;
        }

        const data = (await res.json()) as { token: string; livekitUrl: string };
        setToken(data.token);
        setLivekitUrl(data.livekitUrl);
      } catch (e) {
        console.error("Token fetch failed:", e);
        alert("Could not connect to server. Make sure the server is running.");
        nav("/", { replace: true });
      }
    })();
  }, [room, name, nav]);

  // Socket.IO for chat
  useEffect(() => {
    if (!room || !name.trim()) return;

    const s = io(SERVER_URL, { transports: ["websocket"] });
    setSocket(s);
    s.emit("room:join", { roomId: room, name });

    const onChat = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);
    const onSystem = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);
    s.on("chat:message", onChat);
    s.on("room:system", onSystem);

    return () => {
      s.off("chat:message", onChat);
      s.off("room:system", onSystem);
      s.disconnect();
    };
  }, [room, name]);

  const canJoin = useMemo(
    () => !!token && !!livekitUrl && !!room && !!name.trim(),
    [token, livekitUrl, room, name]
  );

  function send() {
    if (!socket) return;
    const text = draft.trim();
    if (!text) return;
    socket.emit("chat:send", { roomId: room, name, message: text });
    setDraft("");
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!room) return null;

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#030712",
      overflow: "hidden",
    }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        background: "rgba(3,7,18,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Left: branding + room info */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: 9,
            background: "linear-gradient(135deg, #8b5cf6, #22d3ee)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            flexShrink: 0,
          }}>⚡</div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(241,245,249,0.9)" }}>
                Room
              </span>
              <span style={{
                padding: "2px 10px",
                borderRadius: 99,
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.3)",
                fontSize: 12,
                color: "#a78bfa",
                fontWeight: 500,
                fontFamily: "monospace",
                maxWidth: 200,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {room}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(241,245,249,0.35)", marginTop: 1 }}>
              <span style={{
                display: "inline-block",
                width: 6, height: 6,
                borderRadius: "50%",
                background: "#22d3ee",
                marginRight: 5,
                boxShadow: "0 0 6px #22d3ee",
                animation: "pulse-ring 2s ease-in-out infinite",
                verticalAlign: "middle",
              }} />
              {name}
            </div>
          </div>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button className="glass-btn" onClick={copyLink}>
            {copied ? "✓ Copied!" : "Copy Link"}
          </button>
          <button
            className="glass-btn"
            onClick={() => setChatOpen((v) => !v)}
            style={chatOpen ? {
              borderColor: "rgba(139,92,246,0.5)",
              background: "rgba(139,92,246,0.12)",
            } : {}}
          >
            {chatOpen ? "✕ Chat" : "💬 Chat"}
            {!chatOpen && messages.length > 0 && (
              <span style={{
                background: "#8b5cf6",
                borderRadius: 99,
                padding: "1px 7px",
                fontSize: 10,
                fontWeight: 700,
                marginLeft: 2,
              }}>
                {messages.length}
              </span>
            )}
          </button>
          <button
            className="glass-btn"
            onClick={() => nav("/", { replace: true })}
            style={{ borderColor: "rgba(236,72,153,0.35)", color: "#f87171" }}
          >
            Leave
          </button>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

        {/* Video area */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {canJoin ? (
            <LiveKitRoom
              token={token}
              serverUrl={livekitUrl}
              connect={true}
              video={true}
              audio={true}
              style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
              onDisconnected={() => console.log("Disconnected from LiveKit room")}
            >
              <RoomAudioRenderer />
              <div style={{ flex: 1, minHeight: 0 }}>
                <VideoGrid />
              </div>
              <div style={{
                borderTop: "1px solid rgba(255,255,255,0.07)",
                flexShrink: 0,
                background: "rgba(3,7,18,0.7)",
                backdropFilter: "blur(12px)",
              }}>
                <ControlBar variation="minimal" />
              </div>
            </LiveKitRoom>
          ) : (
            <ConnectingState />
          )}
        </div>

        {/* ── Chat sidebar ────────────────────────────────────────────────────── */}
        {chatOpen && (
          <div style={{
            width: 320,
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            flexDirection: "column",
            background: "rgba(3,7,18,0.85)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            animation: "fadeSlideUp 0.25s ease both",
          }}>

            {/* Chat header */}
            <div style={{
              padding: "14px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "rgba(241,245,249,0.9)",
            }}>
              <span>💬</span> Chat
              <span style={{
                marginLeft: "auto",
                fontSize: 12,
                color: "rgba(241,245,249,0.3)",
                fontWeight: 400,
              }}>
                {messages.length} msg{messages.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: "auto", padding: "12px 14px" }}>
              {messages.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  color: "rgba(241,245,249,0.2)",
                  fontSize: 13,
                  marginTop: 40,
                }}>
                  No messages yet
                  <br />
                  <span style={{ fontSize: 24 }}>👋</span>
                </div>
              ) : (
                messages.map((m) => {
                  const isOwn = m.name === name;
                  const isSystem = m.name === "System";
                  return (
                    <div key={m.id} style={{
                      marginBottom: 12,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isSystem ? "center" : isOwn ? "flex-end" : "flex-start",
                    }}>
                      {isSystem ? (
                        <span style={{
                          fontSize: 11,
                          color: "rgba(241,245,249,0.3)",
                          background: "rgba(255,255,255,0.04)",
                          borderRadius: 99,
                          padding: "2px 10px",
                        }}>
                          {m.message}
                        </span>
                      ) : (
                        <>
                          <div style={{ fontSize: 10, color: "rgba(241,245,249,0.3)", marginBottom: 3 }}>
                            {isOwn ? "You" : m.name} · {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div style={{
                            maxWidth: "85%",
                            padding: "8px 12px",
                            borderRadius: isOwn ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                            background: isOwn
                              ? "linear-gradient(135deg, #8b5cf6, #6366f1)"
                              : "rgba(255,255,255,0.07)",
                            border: isOwn ? "none" : "1px solid rgba(255,255,255,0.08)",
                            fontSize: 13,
                            lineHeight: 1.5,
                            color: "rgba(241,245,249,0.9)",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}>
                            {m.message}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: "10px 12px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}>
              <input
                className="glass-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder="Type a message…"
                style={{ fontSize: 13 }}
              />
              <button
                onClick={send}
                style={{
                  flexShrink: 0,
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  border: "none",
                  background: draft.trim()
                    ? "linear-gradient(135deg, #8b5cf6, #6366f1)"
                    : "rgba(255,255,255,0.05)",
                  color: draft.trim() ? "#fff" : "rgba(241,245,249,0.3)",
                  cursor: draft.trim() ? "pointer" : "default",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  fontFamily: "var(--font)",
                }}
              >
                ↑
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}