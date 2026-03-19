/**
 * Interactive terminal page with xterm.js and WebSocket support.
 * Allows users to select a container and open an interactive terminal session.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import { Card } from '../components/ui/Card';
import { getAccessToken } from '../api/client';
import * as api from '../api/client';
import type { ContainerRecord } from '../types/api';

interface TerminalStreamEvent {
  type: 'opened' | 'output' | 'resized' | 'closed' | 'error';
  container_id?: string;
  data?: string;
  cols?: number;
  rows?: number;
  message?: string;
}

interface TerminalClientMsg {
  type: 'input' | 'resize';
  data?: string;
  cols?: number;
  rows?: number;
}

export function TerminalPage() {
  const { containerId } = useParams<{ containerId: string }>();
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [container, setContainer] = useState<ContainerRecord | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch container details
  useEffect(() => {
    if (!containerId) return;

    const fetchContainer = async () => {
      try {
        const data = await api.get<ContainerRecord>(`/api/v1/containers/${containerId}`);
        setContainer(data);
      } catch (err) {
        setError(`Failed to load container: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    fetchContainer();
  }, [containerId]);

  // Initialize terminal and WebSocket connection
  useEffect(() => {
    if (!container || !terminalRef.current || !containerId) return;

    const initTerminal = async () => {
      setIsConnecting(true);
      setError(null);

      try {
        // Create xterm instance
        const term = new Terminal({
          cols: 120,
          rows: 30,
          theme: {
            background: '#0f172a',
            foreground: '#e2e8f0',
            cursor: '#10b981',
          },
        });

        term.open(terminalRef.current!);
        terminalInstance.current = term;

        // Get access token
        const token = getAccessToken();
        if (!token) {
          throw new Error('Not authenticated');
        }

        // Construct WebSocket URL with token
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = import.meta.env.VITE_API_BASE_URL?.replace(/^https?:\/\//, '') || window.location.host;
        const wsUrl = `${wsProtocol}//${wsHost}/ws/terminal/${containerId}?token=${encodeURIComponent(token)}`;

        // Connect to WebSocket
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          // Send initial resize message
          const msg: TerminalClientMsg = {
            type: 'resize',
            cols: term.cols,
            rows: term.rows,
          };
          ws.send(JSON.stringify(msg));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data) as TerminalStreamEvent;

            switch (msg.type) {
              case 'opened':
                term.write('\r\n✓ Terminal session opened\r\n');
                break;
              case 'output':
                if (msg.data) {
                  term.write(msg.data);
                }
                break;
              case 'closed':
                term.write('\r\n✓ Terminal session closed\r\n');
                ws.close();
                break;
              case 'error':
                term.write(`\r\n✗ Error: ${msg.message}\r\n`);
                ws.close();
                break;
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        ws.onerror = () => {
          setError('WebSocket connection error');
          term.write('\r\n✗ Connection error\r\n');
        };

        ws.onclose = () => {
          setIsConnecting(false);
        };

        // Handle terminal input
        term.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) {
            const msg: TerminalClientMsg = {
              type: 'input',
              data,
            };
            ws.send(JSON.stringify(msg));
          }
        });

        // Handle terminal resize
        term.onResize(({ cols, rows }) => {
          if (ws.readyState === WebSocket.OPEN) {
            const msg: TerminalClientMsg = {
              type: 'resize',
              cols,
              rows,
            };
            ws.send(JSON.stringify(msg));
          }
        });

        setIsConnecting(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize terminal');
        setIsConnecting(false);
      }
    };

    initTerminal();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
      }
    };
  }, [container, containerId]);

  if (!containerId) {
    return (
      <Card title="Web Terminal" subtitle="Select a container to open a terminal session.">
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-6 text-sm text-slate-400">
          No container selected. Navigate to a container detail page to open a terminal.
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Web Terminal"
      subtitle={container ? `Connected to ${container.name}` : 'Loading...'}
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-950 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {isConnecting && (
        <div className="mb-4 rounded-lg border border-blue-700 bg-blue-950 p-3 text-sm text-blue-200">
          Connecting to terminal...
        </div>
      )}
      <div
        ref={terminalRef}
        className="rounded-lg border border-slate-700 bg-slate-950 p-4"
        style={{ minHeight: '500px' }}
      />
    </Card>
  );
}
