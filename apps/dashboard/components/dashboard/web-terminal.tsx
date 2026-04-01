"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Maximize2, Minimize2, ExternalLink, Plus, Minus, Upload } from "lucide-react";
import { getAccessToken } from "@/lib/auth";

/** Derives a WebSocket base URL from the REST API base URL. */
function toWsUrl(apiUrl: string): string {
  if (!apiUrl) {
    const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${typeof window !== "undefined" ? window.location.host : ""}`;
  }
  return apiUrl.replace(/^http(s)?:\/\//, (_, s) => `ws${s ?? ""}://`);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface WebTerminalProps {
  containerId: string;
}

export function WebTerminal({ containerId }: WebTerminalProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const termDivRef = useRef<HTMLDivElement>(null);
  // Keep refs so the cleanup closure always sees the latest instances.
  const termRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(13);

  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MiB — must match backend

  const MIN_FONT_SIZE = 2;
  const MAX_FONT_SIZE = 48;

  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "resize", cols, rows }));
    }
  }, []);

  // Track native fullscreen changes (e.g. user presses Escape).
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const popOut = useCallback(() => {
    window.open(
      `/terminal/${containerId}`,
      "_blank",
      "popup,width=1200,height=720,menubar=no,toolbar=no,location=no"
    );
  }, [containerId]);

  const changeFontSize = useCallback((delta: number) => {
    setFontSize((prev) => {
      const newSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, prev + delta));
      if (termRef.current && fitRef.current) {
        termRef.current.options.fontSize = newSize;
        fitRef.current.fit();
        sendResize(termRef.current.cols, termRef.current.rows);
      }
      return newSize;
    });
  }, [sendResize]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so the same file can be re-selected after an error.
    e.target.value = "";
    if (!file || wsRef.current?.readyState !== WebSocket.OPEN) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      termRef.current?.write(
        `\r\n\x1b[31mUpload error: file too large (${(file.size / 1024 / 1024).toFixed(1)} MiB, max 10 MiB)\x1b[0m\r\n`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // dataUrl is "data:<mime>;base64,<b64data>" — strip the prefix.
      const b64 = dataUrl.split(",")[1];
      const path = `/root/${file.name}`;
      termRef.current?.write(`\r\n\x1b[2mUploading ${file.name} → ${path}…\x1b[0m\r\n`);
      wsRef.current?.send(JSON.stringify({ type: "file_upload", path, data: b64 }));
    };
    reader.readAsDataURL(file);
  }, [MAX_UPLOAD_BYTES]);

  useEffect(() => {
    if (!termDivRef.current) return;

    let disposed = false;

    async function init() {
      // Dynamically import xterm so it only loads client-side.
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      if (disposed || !termDivRef.current) return;

      const term = new Terminal({
        theme: { background: "#09090b", foreground: "#e4e4e7", cursor: "#a1a1aa" },
        fontFamily: "'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
        scrollback: 5000,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(termDivRef.current);
      fit.fit();

      termRef.current = term;
      fitRef.current = fit;

      const token = getAccessToken();
      const wsBase = toWsUrl(API_URL);
      const url = `${wsBase}/ws/terminal/${containerId}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send initial dimensions as required by the protocol.
        const dims = fit.proposeDimensions();
        const cols = dims?.cols ?? term.cols;
        const rows = dims?.rows ?? term.rows;
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          if (msg.type === "output") term.write(msg.data as string);
          else if (msg.type === "error") term.write(`\r\n\x1b[31mError: ${msg.message}\x1b[0m\r\n`);
          else if (msg.type === "closed") term.write("\r\n\x1b[2m[session closed]\x1b[0m\r\n");
          else if (msg.type === "file_uploaded")
            term.write(`\r\n\x1b[32mUploaded → ${msg.path as string}\x1b[0m\r\n`);
          else if (msg.type === "file_upload_error")
            term.write(`\r\n\x1b[31mUpload failed (${msg.path as string}): ${msg.message as string}\x1b[0m\r\n`);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (!disposed) term.write("\r\n\x1b[2m[disconnected]\x1b[0m\r\n");
      };

      // Forward keystrokes to the server.
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data }));
        }
      });

      // Handle window resize and fullscreen transitions.
      const onResize = () => {
        // Small delay so the DOM has settled (especially on fullscreen toggle).
        setTimeout(() => {
          fit.fit();
          sendResize(term.cols, term.rows);
        }, 50);
      };
      window.addEventListener("resize", onResize);
      document.addEventListener("fullscreenchange", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
        document.removeEventListener("fullscreenchange", onResize);
      };
    }

    const cleanupPromise = init();

    return () => {
      disposed = true;
      cleanupPromise.then((cleanup) => cleanup?.());
      wsRef.current?.close();
      termRef.current?.dispose();
      wsRef.current = null;
      termRef.current = null;
      fitRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  return (
    <div
      ref={wrapperRef}
      className="flex flex-col rounded-lg overflow-hidden bg-[#09090b] ring-1 ring-foreground/10"
      style={isFullscreen ? { height: "100vh" } : {}}
    >
      {/* Hidden file input — triggered by the upload button */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
      />
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 shrink-0">
        <span className="text-xs text-zinc-500 font-mono select-none">terminal</span>
        <div className="flex items-center gap-1">
          {/* Font size controls */}
          <div className="flex items-center gap-0.5 mr-2 border-r border-white/10 pr-2">
            <button
              onClick={() => changeFontSize(-1)}
              disabled={fontSize <= MIN_FONT_SIZE}
              title="Decrease font size"
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="text-xs text-zinc-400 font-mono w-8 text-center select-none">
              {fontSize}px
            </span>
            <button
              onClick={() => changeFontSize(1)}
              disabled={fontSize >= MAX_FONT_SIZE}
              title="Increase font size"
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload file to /root/"
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors"
          >
            <Upload className="size-3.5" />
          </button>
          <button
            onClick={popOut}
            title="Pop out into new window"
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="size-3.5" />
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </div>
      {/* xterm mount point */}
      <div
        ref={termDivRef}
        className="flex-1 overflow-hidden"
        style={{ padding: "8px", minHeight: isFullscreen ? 0 : "17rem" }}
      />
    </div>
  );
}

