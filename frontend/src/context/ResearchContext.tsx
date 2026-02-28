import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { ResearchSession, Checkpoint, AgentNode, AgentState, ToolCall } from '@/types/research';

import { createResearchService, type ResearchService } from '@/services/research-service';

interface ResearchStore {
  sessions: ResearchSession[];
  activeSessionId: string | null;
  rewindCheckpointIdx: number | null;
  liveStates: Record<AgentNode, AgentState>;
  liveCheckpoints: Checkpoint[];
  isStreaming: boolean;
  activeNode: AgentNode;
  tokenBuffer: string; // accumulates agent:token text
  error: string | null;
}

type Action =
  | { type: 'START_SESSION'; session: ResearchSession }
  | { type: 'SET_ACTIVE'; id: string | null }
  | { type: 'LIVE_NODE_START'; node: AgentNode }
  | { type: 'LIVE_THOUGHT'; text: string }
  | { type: 'LIVE_TOKEN'; text: string }
  | { type: 'LIVE_NODE_COMPLETE'; node: AgentNode }
  | { type: 'LIVE_CHECKPOINT'; checkpoint: Checkpoint }
  | { type: 'LIVE_COMPLETE'; report: string }
  | { type: 'LIVE_ERROR'; message: string }
  | { type: 'SET_REWIND'; idx: number | null }
  | { type: 'SET_STREAMING'; value: boolean }
  | { type: 'LIVE_TOOL_CALL'; toolCall: ToolCall };

const emptyAgentState = (node: AgentNode): AgentState => ({
  node, status: 'idle', logs: [], toolCalls: [],
});

const initialLiveStates: Record<AgentNode, AgentState> = {
  researcher: emptyAgentState('researcher'),
  analyst: emptyAgentState('analyst'),
  writer: emptyAgentState('writer'),
};

const initialState: ResearchStore = {
  sessions: [],
  activeSessionId: null,
  rewindCheckpointIdx: null,
  liveStates: initialLiveStates,
  liveCheckpoints: [],
  isStreaming: false,
  activeNode: 'researcher',
  tokenBuffer: '',
  error: null,
};

function reducer(state: ResearchStore, action: Action): ResearchStore {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...state,
        sessions: [action.session, ...state.sessions],
        activeSessionId: action.session.id,
        liveStates: { ...initialLiveStates },
        liveCheckpoints: [],
        rewindCheckpointIdx: null,
        isStreaming: true,
        activeNode: 'researcher',
        tokenBuffer: '',
        error: null,
      };
    case 'SET_ACTIVE':
      return { ...state, activeSessionId: action.id, rewindCheckpointIdx: null };
    case 'LIVE_NODE_START':
      return {
        ...state,
        activeNode: action.node,
        tokenBuffer: '',
        liveStates: {
          ...state.liveStates,
          [action.node]: { ...state.liveStates[action.node], status: 'running' },
        },
      };
    case 'LIVE_THOUGHT': {
      const node = state.activeNode;
      return {
        ...state,
        liveStates: {
          ...state.liveStates,
          [node]: {
            ...state.liveStates[node],
            logs: [...state.liveStates[node].logs, action.text],
          },
        },
      };
    }
    case 'LIVE_TOKEN':
      return { ...state, tokenBuffer: state.tokenBuffer + action.text };
    case 'LIVE_TOOL_CALL': {
      const node = state.activeNode;
      return {
        ...state,
        liveStates: {
          ...state.liveStates,
          [node]: {
            ...state.liveStates[node],
            toolCalls: [...state.liveStates[node].toolCalls, action.toolCall],
          },
        },
      };
    }
    case 'LIVE_NODE_COMPLETE': {
      // Snapshot checkpoint when a node completes
      const nodeIdx = (['researcher', 'analyst', 'writer'] as AgentNode[]).indexOf(action.node);
      const states: Record<AgentNode, AgentState> = {
        researcher: { ...state.liveStates.researcher, status: nodeIdx >= 0 ? 'complete' : state.liveStates.researcher.status },
        analyst: { ...state.liveStates.analyst, status: nodeIdx >= 1 ? 'complete' : state.liveStates.analyst.status },
        writer: { ...state.liveStates.writer, status: nodeIdx >= 2 ? 'complete' : state.liveStates.writer.status },
      };
      const checkpoint: Checkpoint = {
        id: `cp-live-${nodeIdx}`,
        timestamp: Date.now(),
        agentStates: states,
        activeNode: action.node,
      };
      return {
        ...state,
        liveStates: {
          ...state.liveStates,
          [action.node]: { ...state.liveStates[action.node], status: 'complete' },
        },
        liveCheckpoints: [...state.liveCheckpoints, checkpoint],
      };
    }
    case 'LIVE_CHECKPOINT':
      return { ...state, liveCheckpoints: [...state.liveCheckpoints, action.checkpoint] };
    case 'LIVE_ERROR':
      return { ...state, error: action.message, isStreaming: false };
    case 'LIVE_COMPLETE': {
      return {
        ...state,
        isStreaming: false,
        sessions: state.sessions.map(s =>
          s.id === state.activeSessionId
            ? { ...s, status: 'completed' as const, completedAt: Date.now(), checkpoints: state.liveCheckpoints, finalReport: action.report }
            : s
        ),
      };
    }
    case 'SET_REWIND':
      return { ...state, rewindCheckpointIdx: action.idx };
    case 'SET_STREAMING':
      return { ...state, isStreaming: action.value };
    default:
      return state;
  }
}

interface ResearchContextValue {
  store: ResearchStore;
  startResearch: (query: string) => void;
  setActiveSession: (id: string | null) => void;
  setRewind: (idx: number | null) => void;
  rewindViaService: (checkpointId: string) => void;
  getActiveSession: () => ResearchSession | undefined;
}

const ResearchContext = createContext<ResearchContextValue | null>(null);

export function ResearchProvider({ children }: { children: React.ReactNode }) {
  const [store, dispatch] = useReducer(reducer, initialState);
  const serviceRef = useRef<ResearchService | null>(null);

  // Create service once
  useEffect(() => {
    serviceRef.current = createResearchService();
    return () => {
      serviceRef.current?.disconnect();
    };
  }, []);

  const startResearch = useCallback((query: string) => {
    serviceRef.current?.disconnect();

    const threadId = `session-${Date.now()}`;
    const session: ResearchSession = {
      id: threadId,
      query,
      startedAt: Date.now(),
      status: 'in-progress',
      checkpoints: [],
    };

    dispatch({ type: 'START_SESSION', session });

    serviceRef.current?.start(query, threadId, {
      onNodeStart(node) {
        dispatch({ type: 'LIVE_NODE_START', node });
      },
      onNodeComplete(node) {
        dispatch({ type: 'LIVE_NODE_COMPLETE', node });
      },
      onThought(text) {
        dispatch({ type: 'LIVE_THOUGHT', text });
      },
      onToken(text) {
        dispatch({ type: 'LIVE_TOKEN', text });
      },
      onToolCall(toolCall) {
        dispatch({ type: 'LIVE_TOOL_CALL', toolCall });
      },
      onError(message) {
        dispatch({ type: 'LIVE_ERROR', message });
      },
      onComplete(report) {
        dispatch({ type: 'LIVE_COMPLETE', report });
      },
    });
  }, []);

  const setActiveSession = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE', id });
  }, []);

  const setRewind = useCallback((idx: number | null) => {
    dispatch({ type: 'SET_REWIND', idx });
  }, []);

  const rewindViaService = useCallback((checkpointId: string) => {
    serviceRef.current?.rewind(checkpointId);
  }, []);

  const getActiveSession = useCallback(() => {
    return store.sessions.find(s => s.id === store.activeSessionId);
  }, [store.sessions, store.activeSessionId]);

  return (
    <ResearchContext.Provider value={{ store, startResearch, setActiveSession, setRewind, rewindViaService, getActiveSession }}>
      {children}
    </ResearchContext.Provider>
  );
}

export function useResearch() {
  const ctx = useContext(ResearchContext);
  if (!ctx) throw new Error('useResearch must be used within ResearchProvider');
  return ctx;
}
