import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ChangeEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useVoice } from '../hooks/useVoice';
import { BotIcon, MicIcon, SendIcon, CheckIcon, ShieldIcon, CameraIcon, CloseIcon } from './Icons';
import type { ChatMessage } from '../types';

function TypingDots() {
  return (
    <span className="inline-flex gap-1.5 py-1">
      <i className="dot h-1.5 w-1.5 rounded-full bg-stone-400 dark:bg-stone-500" />
      <i className="dot h-1.5 w-1.5 rounded-full bg-stone-400 dark:bg-stone-500" />
      <i className="dot h-1.5 w-1.5 rounded-full bg-stone-400 dark:bg-stone-500" />
    </span>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Live "what the agent is doing right now" line (searching, thinking…).
function StatusLine({ label }: { label: string }) {
  return (
    <div className="mt-1.5 flex items-center gap-2 text-[13px] font-medium italic text-stone-400 dark:text-stone-500">
      <Spinner className="h-3.5 w-3.5 animate-spin text-stone-300 dark:text-stone-600" />
      {label}
    </div>
  );
}

function Message({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'user') {
    return (
      <div className="max-w-[85%] self-end rounded-2xl rounded-tr-md bg-brand px-4 py-2.5 text-[15px] font-medium text-white shadow-sm">
        {msg.image && (
          <div className="mb-2 overflow-hidden rounded-xl border border-white/20 bg-black/10">
            <img
              src={msg.image}
              alt="Order note"
              className="max-h-48 w-auto rounded-xl object-contain"
            />
          </div>
        )}
        {msg.text && <div>{msg.text}</div>}
      </div>
    );
  }
  const empty = !msg.text;
  const showDots = empty && !msg.status && !msg.guardNote && msg.streaming;
  return (
    <div className="max-w-[92%] self-start rounded-2xl rounded-tl-md bg-stone-100 px-4 py-2.5 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
      {msg.guardNote && (
        <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11.5px] font-semibold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20">
          <ShieldIcon className="h-3 w-3" />
          {msg.guardNote}
        </div>
      )}
      {!empty && (
        <div className="md">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
        </div>
      )}
      {msg.status ? <StatusLine label={msg.status} /> : showDots ? <TypingDots /> : null}
    </div>
  );
}

interface ChatProps {
  messages: ChatMessage[];
  onSend: (text: string, image?: string | null) => void;
  showConfirm: boolean;
}

export default function Chat({ messages, onSend, showConfirm }: ChatProps) {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [micNote, setMicNote] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onInterim = useCallback((t: string) => setInput(t), []);
  const onNote = useCallback((n: string | null) => setMicNote(n), []);
  const { recording, start, stop } = useVoice({ onInterim, onNote });

  // Autoscroll to newest message / streamed token.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, showConfirm, selectedImage]);

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1024;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedImage(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
    e.target.value = '';
  };

  // Generate a clear sample handwritten-style catering note for 1-click demos
  const loadSampleNote = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sticky note background
    ctx.fillStyle = '#FEF9C3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

    // Title
    ctx.fillStyle = '#713F12';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('📝 Catering Lunch Order', 30, 48);

    // Divider line
    ctx.strokeStyle = '#EAB308';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, 64);
    ctx.lineTo(450, 64);
    ctx.stroke();

    // Items
    ctx.fillStyle = '#1C1917';
    ctx.font = '19px "Comic Sans MS", "Caveat", system-ui, cursive, sans-serif';
    ctx.fillText('• 2x Beef Suya', 35, 110);
    ctx.fillText('• 1x Zobo Drink (chilled)', 35, 155);
    ctx.fillText('• 1x Puff Puff (6 pcs)', 35, 200);
    ctx.fillText('• 1x Cold Chapman', 35, 245);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSelectedImage(dataUrl);
  };

  const submit = () => {
    const text = input.trim();
    if (!text && !selectedImage) return;
    const img = selectedImage;
    setInput('');
    setSelectedImage(null);
    onSend(text, img);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Hold-to-talk: pointer events cover mouse + touch.
  const micDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    start();
  };
  const micUp = async (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const text = await stop();
    setInput('');
    if (text) onSend(text, selectedImage);
  };
  const micLeave = async () => {
    if (recording) {
      const text = await stop();
      setInput('');
      if (text) onSend(text, selectedImage);
    }
  };

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-100 dark:bg-stone-900 dark:ring-stone-800">
      <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-4 dark:border-stone-800">
        <div className="relative grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-brand dark:bg-brand/20">
          <BotIcon className="h-5 w-5" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-stone-900" />
        </div>
        <div className="leading-tight">
          <div className="font-bold text-stone-900 dark:text-stone-100">Order Assistant</div>
          <div className="text-xs text-stone-400 dark:text-stone-500">Online — text, voice or photo note</div>
        </div>
      </div>

      <div ref={listRef} className="flex grow flex-col gap-3 overflow-y-auto bg-[#FCFAF9] p-5 dark:bg-stone-950">
        {messages.map((m) => (
          <Message key={m.id} msg={m} />
        ))}
      </div>

      <div className="border-t border-stone-100 p-3 dark:border-stone-800">
        {micNote && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-medium text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20">
            <MicIcon className="h-4 w-4 flex-none" />
            <span>{micNote}</span>
          </div>
        )}

        {/* Selected image preview tray */}
        {selectedImage && (
          <div className="mb-2 flex items-center gap-3 rounded-2xl bg-amber-50/80 p-2 pl-3 ring-1 ring-amber-200/70 dark:bg-stone-800 dark:ring-stone-700">
            <img
              src={selectedImage}
              alt="Order note preview"
              className="h-12 w-12 rounded-lg object-cover ring-1 ring-black/10 dark:ring-white/10"
            />
            <div className="flex-1 text-xs">
              <div className="font-semibold text-stone-800 dark:text-stone-200">Order Note Attached</div>
              <div className="text-stone-500 dark:text-stone-400">Click send to have AI read and reserve items</div>
            </div>
            <button
              type="button"
              title="Remove image"
              onClick={() => setSelectedImage(null)}
              className="grid h-7 w-7 place-items-center rounded-full text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-700 dark:hover:text-stone-200"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 1-Click Try Sample Note button if no image is staged */}
        {!selectedImage && !showConfirm && (
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={loadSampleNote}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/70 transition hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
            >
              <CameraIcon className="h-3.5 w-3.5" />
              <span>📷 Snap & Order (Try sample note)</span>
            </button>
          </div>
        )}

        {showConfirm && (
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSend('yes')}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-600"
            >
              <CheckIcon className="h-4 w-4" />
              Confirm order
            </button>
            <button
              type="button"
              onClick={() => onSend('cancel')}
              className="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-500 transition hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-full bg-stone-100 p-1.5 pl-4 dark:bg-stone-800">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent text-[15px] text-stone-800 placeholder:text-stone-400 focus:outline-none dark:text-stone-200 dark:placeholder:text-stone-500"
            placeholder={
              recording
                ? 'Listening…'
                : selectedImage
                ? 'Add instructions or press Send…'
                : 'Message or snap a note…'
            }
          />

          {/* Camera upload button */}
          <button
            type="button"
            title="Snap or upload order note"
            onClick={() => fileInputRef.current?.click()}
            className="grid h-10 w-10 place-items-center rounded-full text-stone-500 transition hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700"
          >
            <CameraIcon className="h-5 w-5" />
          </button>

          {/* Mic hold-to-talk button */}
          <button
            type="button"
            title="Hold to talk"
            onPointerDown={micDown}
            onPointerUp={micUp}
            onPointerLeave={micLeave}
            onPointerCancel={micLeave}
            className={`grid h-10 w-10 place-items-center rounded-full transition ${
              recording
                ? 'mic-recording bg-brand text-white'
                : 'text-stone-500 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700'
            }`}
          >
            <MicIcon className="h-5 w-5" />
          </button>

          {/* Submit button */}
          <button
            type="button"
            onClick={submit}
            className="grid h-10 w-10 place-items-center rounded-full bg-brand text-white transition hover:bg-brand-600"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
