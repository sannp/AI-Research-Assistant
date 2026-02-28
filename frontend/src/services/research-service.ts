/**
 * Research Service — abstraction over the backend transport.
 *
 * Matches the AsyncAPI spec:
 *   Frontend → Backend:  research:start, research:rewind
 *   Backend → Frontend:  agent:node_start, agent:thought, agent:token, agent:error, agent:complete
 *
 * When VITE_WS_URL is set, connects via Socket.io.
 * Otherwise falls back to the local mock-streaming simulation.
 */

import type { AgentNode } from '@/types/research';

// ── Public interface ────────────────────────────────────────────────
export interface ResearchServiceCallbacks {
  onNodeStart: (node: AgentNode) => void;
  onNodeComplete: (node: AgentNode) => void;
  onThought: (text: string) => void;
  onToken: (text: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onToolCall: (toolCall: any) => void;
  onError: (message: string) => void;
  onComplete: (report: string) => void;
}

export interface ResearchService {
  /** Start a new research run */
  start(query: string, threadId: string, callbacks: ResearchServiceCallbacks): void;
  /** Rewind to a previous checkpoint */
  rewind(checkpointId: string): void;
  /** Tear down the connection / cancel the run */
  disconnect(): void;
}

// ── Socket.io implementation ────────────────────────────────────────
function createSocketService(): ResearchService {
  // Dynamic import so the page doesn't break if socket.io-client
  // is tree-shaken in mock-only builds.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let socket: any = null;

  async function ensureSocket() {
    if (socket) return socket;
    const { io } = await import('socket.io-client');
    const url = import.meta.env.VITE_WS_URL as string;
    socket = io(url, { transports: ['websocket', 'polling'] });
    return socket;
  }

  return {
    async start(query, threadId, cb) {
      const s = await ensureSocket();

      let currentNode: AgentNode | null = null;

      // Bind listeners (idempotent — .off first)
      s.off('agent:node_start').on('agent:node_start', (node: string) => {
        // Infer previous node completion from new node start
        if (currentNode && currentNode !== node) {
          cb.onNodeComplete(currentNode);
        }
        currentNode = node as AgentNode;
        cb.onNodeStart(node as AgentNode);
      });
      s.off('agent:thought').on('agent:thought', (text: string) => {
        cb.onThought(text);
      });
      s.off('agent:token').on('agent:token', (text: string) => {
        cb.onToken(text);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      s.off('agent:tool_call').on('agent:tool_call', (tc: any) => {
        cb.onToolCall(tc);
      });
      s.off('agent:error').on('agent:error', (msg: string) => {
        cb.onError(msg);
      });
      s.off('agent:complete').on('agent:complete', (report: string) => {
        // Complete the last running node before finishing
        if (currentNode) cb.onNodeComplete(currentNode);
        cb.onComplete(report);
      });

      s.emit('research:start', { query, threadId });
    },

    async rewind(checkpointId) {
      const s = await ensureSocket();
      s.emit('research:rewind', checkpointId);
    },

    disconnect() {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    },
  };
}

// ── Factory ─────────────────────────────────────────────────────────
export function createResearchService(): ResearchService {
  const wsUrl = import.meta.env.VITE_WS_URL;
  if (!wsUrl) {
    console.warn('[ResearchService] VITE_WS_URL is not set');
  } else {
    console.log('[ResearchService] Using Socket.io →', wsUrl);
  }
  return createSocketService();
}
