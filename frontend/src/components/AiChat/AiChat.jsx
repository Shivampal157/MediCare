import { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { API_BASE } from "../../lib/api.js";

const STARTERS = ["Bukhar hai, kis doctor ko dikhau?", "BP check karwana hai", "Appointment kaise book karun?"];

export default function AiChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Namaste, main MediCare assistant hoon. Symptoms, doctor, ya test ke baare mein poochho. Main diagnosis nahi karta — booking mein help karta hoon.",
    },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text) {
    const question = text.trim();
    if (!question || loading) return;
    const next = [...messages, { role: "user", text: question }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((item) => ({ role: item.role, text: item.text })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      const reply = body.reply || body.message || "Abhi jawab nahi aa saka. WhatsApp se clinic se baat kar lo.";
      setMessages([...next, { role: "assistant", text: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", text: "Network issue. Thodi der baad try karo ya WhatsApp use karo." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open ? (
        <div className="fixed right-4 bottom-24 z-50 flex h-[28rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl sm:right-6">
          <div className="flex items-center justify-between bg-[#0f7a4a] px-4 py-3 text-white">
            <div>
              <p className="font-semibold">MediCare AI</p>
              <p className="text-xs text-emerald-100">Guidance only, not a diagnosis</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full p-1 hover:bg-white/10">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto bg-[#f3faf6] p-3">
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                  item.role === "user" ? "ml-auto bg-[#0f7a4a] text-white" : "bg-white text-emerald-900 shadow-sm"
                }`}
              >
                {item.text}
              </div>
            ))}
            {loading ? <p className="text-xs text-emerald-700">Soch raha hoon...</p> : null}
            <div ref={endRef} />
          </div>
          <div className="flex flex-wrap gap-1 border-t border-emerald-100 bg-white px-3 pt-2">
            {STARTERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => send(item)}
                className="rounded-full border border-emerald-200 px-2 py-1 text-[11px] text-emerald-800"
              >
                {item}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Apna sawal likho..."
              maxLength={500}
              className="flex-1 rounded-full border border-emerald-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300"
            />
            <button type="submit" disabled={loading} className="rounded-full bg-[#0f7a4a] p-2 text-white disabled:opacity-50" aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed right-6 bottom-24 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0f7a4a] text-white shadow-lg"
        aria-label="Open MediCare AI chat"
      >
        <Bot size={22} />
      </button>
    </>
  );
}
