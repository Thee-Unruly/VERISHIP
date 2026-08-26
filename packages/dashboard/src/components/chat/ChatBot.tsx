"use client";

import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Updated n8n Q&A workflow Webhook (Production Endpoint)
const N8N_WEBHOOK_URL = "https://heavily-busy-titmouse.ngrok-free.app/webhook/veriship-qa";

function generateSessionId() {
  return "session-" + Math.random().toString(36).substring(2, 12);
}

function getSessionId() {
  if (typeof window === "undefined") return "default-session";
  let id = sessionStorage.getItem("chat_session_id");
  if (!id) {
    id = generateSessionId();
    sessionStorage.setItem("chat_session_id", id);
  }
  return id;
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! 👋 I'm your VeriBot Q&A Assistant. Ask me anything about VeriShip's quality data or project status.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(getSessionId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Define paths where the chatbot should be visible
  const qaManagementPaths = ["/projects", "/requirements", "/test-cases", "/defects", "/releases"];
  const isVisible = qaManagementPaths.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  if (!isVisible) return null;

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({
          message: text,
          sessionId,
          user_id: JSON.parse(localStorage.getItem("user") || "{}")?.id || 0,
          user_name: JSON.parse(localStorage.getItem("user") || "{}")?.username || "",
        }),
      });
      const data = await res.json();
      console.log("n8n Response:", data);

      // Try every possible key that n8n/AI models use
      const reply =
        data?.output ||
        data?.response ||
        data?.text ||
        data?.[0]?.output ||
        data?.[0]?.response ||
        data?.[0]?.text ||
        (typeof data === 'string' ? data : null) ||
        `Unknown response format. Raw data: ${JSON.stringify(data).substring(0, 100)}...`;

      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

        .cb-root * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }

        .cb-bubble {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(199 89% 48%) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          z-index: 9999;
        }
        .cb-bubble:hover {
          transform: scale(1.08);
          box-shadow: 0 12px 40px rgba(15, 23, 42, 0.5), 0 0 20px rgba(37, 99, 235, 0.3);
        }
        .cb-bubble svg { transition: transform 0.3s ease; }
        .cb-bubble.open svg { transform: rotate(90deg); }

        .cb-badge {
          position: absolute;
          top: 0px;
          right: 0px;
          width: 14px;
          height: 14px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid hsl(222 47% 11%);
        }

        .cb-window {
          position: fixed;
          bottom: 96px;
          right: 24px;
          width: 400px;
          height: 600px;
          background: hsl(222 47% 12%);
          border: 1px solid hsl(222 30% 25%);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.6);
          z-index: 9998;
          overflow: hidden;
          transform-origin: bottom right;
          animation: cb-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes cb-pop {
          from { transform: scale(0.85); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }

        .cb-header {
          padding: 20px 24px;
          border-bottom: 1px solid hsl(222 30% 25%);
          display: flex;
          align-items: center;
          gap: 14px;
          background: hsl(222 47% 18%);
        }
        .cb-avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(199 89% 48%) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }
        .cb-header-info { flex: 1; }
        .cb-header-name {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.3px;
        }
        .cb-header-status {
          font-size: 12px;
          color: hsl(215 20% 65%);
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
        }
        .cb-status-dot {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
        }
        .cb-close {
          background: none;
          border: none;
          color: hsl(215 20% 65%);
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          display: flex;
          transition: all 0.2s;
        }
        .cb-close:hover { color: #ffffff; background: hsl(222 30% 15%); }

        .cb-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px 16px 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          scrollbar-width: thin;
          scrollbar-color: #222 transparent;
        }
        .cb-messages::-webkit-scrollbar { width: 4px; }
        .cb-messages::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }

        .cb-msg {
          display: flex;
          flex-direction: column;
          max-width: 86%;
          animation: cb-fade 0.18s ease;
        }
        @keyframes cb-fade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cb-msg.user { align-self: flex-end; align-items: flex-end; }
        .cb-msg.assistant { align-self: flex-start; align-items: flex-start; }

        .cb-bubble-text {
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.6;
          word-break: break-word;
        }
        .cb-msg.user .cb-bubble-text {
          background: hsl(217 91% 60%);
          color: #ffffff;
          border-bottom-right-radius: 4px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }
        .cb-msg.assistant .cb-bubble-text {
          background: hsl(222 30% 22%);
          color: hsl(210 40% 98%);
          border: 1px solid hsl(222 30% 30%);
          border-bottom-left-radius: 4px;
        }

        /* Markdown & Table Styling */
        .cb-bubble-text p { margin: 0 0 8px 0; }
        .cb-bubble-text p:last-child { margin-bottom: 0; }
        .cb-bubble-text strong { color: hsl(217 91% 70%); font-weight: 600; }
        .cb-bubble-text table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 12px 0; 
          font-size: 13px;
          border: 1px solid hsl(222 30% 30%);
          border-radius: 8px;
          overflow: hidden;
          display: block;
          overflow-x: auto;
        }
        .cb-bubble-text th { 
          background: hsl(222 47% 15%); 
          text-align: left; 
          padding: 10px; 
          border-bottom: 2px solid hsl(222 30% 35%);
          color: hsl(215 20% 85%);
          font-weight: 600;
        }
        .cb-bubble-text td { 
          padding: 8px 10px; 
          border-bottom: 1px solid hsl(222 30% 28%);
          color: hsl(215 10% 80%);
        }
        .cb-bubble-text tr:last-child td { border-bottom: none; }
        .cb-bubble-text tr:hover td { background: rgba(255, 255, 255, 0.03); }
        
        .cb-bubble-text ul, .cb-bubble-text ol { 
          padding-left: 20px; 
          margin: 8px 0; 
        }
        .cb-bubble-text li { margin-bottom: 4px; }
        
        .cb-bubble-text code {
          background: hsl(222 47% 10%);
          padding: 2px 5px;
          border-radius: 4px;
          font-family: 'DM Mono', monospace;
          font-size: 0.9em;
          color: hsl(199 89% 60%);
        }

        .cb-typing {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 12px 14px;
          background: hsl(222 30% 22%);
          border: 1px solid hsl(222 30% 30%);
          border-radius: 16px;
          border-bottom-left-radius: 4px;
          width: fit-content;
        }
        .cb-typing span {
          width: 6px;
          height: 6px;
          background: #444;
          border-radius: 50%;
          animation: cb-bounce 1.2s infinite;
        }
        .cb-typing span:nth-child(2) { animation-delay: 0.15s; }
        .cb-typing span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes cb-bounce {
          0%, 60%, 100% { transform: translateY(0); background: #444; }
          30% { transform: translateY(-5px); background: #888; }
        }

        .cb-input-area {
          padding: 20px 24px;
          border-top: 1px solid hsl(222 30% 25%);
          background: hsl(222 47% 10%);
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }
        .cb-input {
          flex: 1;
          background: hsl(222 30% 16%);
          border: 1px solid hsl(222 30% 25%);
          border-radius: 16px;
          color: #ffffff;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          padding: 12px 16px;
          resize: none;
          outline: none;
          min-height: 48px;
          max-height: 120px;
          line-height: 1.5;
          transition: all 0.2s;
        }
        .cb-input::placeholder { color: hsl(215 16% 50%); }
        .cb-input:focus { border-color: hsl(217 91% 60%); background: hsl(222 30% 20%); }

        .cb-send {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: hsl(217 91% 60%);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .cb-send:hover:not(:disabled) { 
          background: hsl(217 91% 65%); 
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }
        .cb-send:disabled { background: hsl(222 30% 20%); cursor: not-allowed; box-shadow: none; }
        .cb-send:disabled svg path { stroke: hsl(215 16% 40%); }

        .cb-footer {
          text-align: center;
          font-size: 10.5px;
          color: #2e2e2e;
          padding: 0 0 4px;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.3px;
        }

        @media (max-width: 480px) {
          .cb-window {
            bottom: 0;
            right: 0;
            width: 100vw;
            height: 100dvh;
            border-radius: 0;
          }
          .cb-bubble { bottom: 20px; right: 20px; }
        }
      `}</style>

      <div className="cb-root">
        {/* Chat Window */}
        {open && (
          <div className="cb-window" role="dialog" aria-label="Chat assistant">
            {/* Header */}
            <div className="cb-header">
              <div className="cb-avatar">
                <svg width="28" height="28" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
                  <rect x="1" y="0" width="6" height="1" fill="#3b1f0e" />
                  <rect x="0" y="1" width="1" height="2" fill="#3b1f0e" />
                  <rect x="7" y="1" width="1" height="2" fill="#3b1f0e" />
                  <rect x="1" y="1" width="6" height="5" fill="#f5c5a3" />
                  <rect x="2" y="3" width="1" height="1" fill="#1a1a2e" />
                  <rect x="5" y="3" width="1" height="1" fill="#1a1a2e" />
                  <rect x="3" y="5" width="2" height="1" fill="#c47a5a" />
                  <rect x="3" y="6" width="2" height="1" fill="#f5c5a3" />
                  <rect x="1" y="7" width="6" height="1" fill="#2563eb" />
                </svg>
              </div>
              <div className="cb-header-info">
                <div className="cb-header-name">VeriBot Q&A</div>
                <div className="cb-header-status">
                  <div className="cb-status-dot" />
                  Your dedicated Q&A Agent
                </div>
              </div>
              <button className="cb-close" onClick={() => setOpen(false)} aria-label="Close chat">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="cb-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`cb-msg ${msg.role}`}>
                  <div className="cb-bubble-text">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="cb-msg assistant">
                  <div className="cb-typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="cb-input-area">
              <textarea
                ref={inputRef}
                className="cb-input"
                placeholder="Ask about bugs, test cases, or projects..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
              />
              <button
                className="cb-send"
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                aria-label="Send message"
              >
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 8H2.5M13.5 8L9 3.5M13.5 8L9 12.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="cb-footer">powered by your n8n</div>
          </div>
        )}

        {/* Floating Bubble */}
        <button
          className={`cb-bubble ${open ? "open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle chat"
        >
          {!open && <div className="cb-badge" />}
          {open ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M14 4L4 14M4 4l10 10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M17 10c0 3.866-3.134 7-7 7a6.973 6.973 0 01-3.5-.937L3 17l.937-3.5A6.973 6.973 0 013 10c0-3.866 3.134-7 7-7s7 3.134 7 7z" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
