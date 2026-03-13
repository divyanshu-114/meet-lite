import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThreeBackground from "../components/ThreeBackground";

function randomRoomId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function Home() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [copied, setCopied] = useState(false);

  const suggested = useMemo(() => randomRoomId(), []);

  function handleCreate() {
    if (!name.trim()) {
      shake("name-input");
      return;
    }
    nav(`/room/${suggested}`, { state: { name } });
  }

  function handleJoin() {
    if (!name.trim()) {
      shake("name-input");
      return;
    }
    if (!roomId.trim()) {
      shake("room-input");
      return;
    }
    nav(`/room/${roomId.trim()}`, { state: { name } });
  }

  function shake(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("shake");
    setTimeout(() => el.classList.remove("shake"), 500);
  }

  function copySuggested() {
    setRoomId(suggested);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <ThreeBackground />

      {/* Content layer */}
      <div style={{
        position: "relative",
        zIndex: 1,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}>

        {/* Hero heading */}
        <div style={{
          textAlign: "center",
          marginBottom: 48,
          animation: "fadeSlideUp 0.7s ease both",
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}>
            {/* Logo mark */}
            <h1 style={{
              fontSize: "clamp(36px, 6vw, 60px)",
              fontWeight: 800,
              background: "linear-gradient(135deg, #a78bfa 0%, #22d3ee 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-1.5px",
              lineHeight: 1,
            }}>
              Meet Lite
            </h1>
          </div>
          <p style={{
            fontSize: 17,
            color: "rgba(241,245,249,0.55)",
            fontWeight: 400,
            letterSpacing: "0.3px",
          }}>
            Crystal-clear video • Screenshare • Ephemeral chat
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{
          width: "100%",
          maxWidth: 480,
          padding: "36px 32px",
          animation: "fadeSlideUp 0.7s 0.15s ease both",
          opacity: 0,
        }}>

          {/* Name field */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Your Name</label>
            <input
              id="name-input"
              className="glass-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alice"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
          </div>

          {/* Room ID field */}
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Room ID</label>
            <input
              id="room-input"
              className="glass-input"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter or generate below"
              onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
            />
          </div>

          {/* Suggested chip */}
          <div style={{ marginBottom: 28 }}>
            <button
              onClick={copySuggested}
              style={{
                background: "none",
                border: "1px solid rgba(139,92,246,0.35)",
                borderRadius: 99,
                padding: "4px 12px",
                fontSize: 12,
                color: copied ? "#22d3ee" : "rgba(167,139,250,0.8)",
                cursor: "pointer",
                fontFamily: "var(--font)",
                transition: "all 0.2s",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {copied ? "✓ copied!" : `✨ ${suggested}`}
            </button>
            <span style={{ fontSize: 12, color: "rgba(241,245,249,0.3)", marginLeft: 8 }}>
              click to use this room ID
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12 }}>
            <button className="primary-btn" style={{ flex: 1 }} onClick={handleCreate}>
              New Room
            </button>
            <button className="ghost-btn" style={{ flex: 1 }} onClick={handleJoin}>
              → Join Room
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p style={{
          marginTop: 32,
          fontSize: 12,
          color: "rgba(241,245,249,0.25)",
          animation: "fadeSlideUp 0.7s 0.3s ease both",
          opacity: 0,
        }}>
          No account required · Rooms close when everyone leaves
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60%  { transform: translateX(-6px); }
          40%,80%  { transform: translateX(6px); }
        }
        .shake { animation: shake 0.45s ease; border-color: rgba(236,72,153,0.7) !important; }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 500,
  color: "rgba(241,245,249,0.6)",
  letterSpacing: "0.4px",
  textTransform: "uppercase",
};