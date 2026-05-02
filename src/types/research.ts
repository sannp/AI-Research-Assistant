export type AgentNode = 'researcher' | 'analyst' | 'writer';
export type AgentStatus = 'idle' | 'running' | 'complete';
export type SessionStatus = 'in-progress' | 'completed' | 'failed';

export interface ToolCall {
  tool: string;
  input: string;
  output: string;
}

export interface AgentState {
  node: AgentNode;
  status: AgentStatus;
  logs: string[];
  toolCalls: ToolCall[];
  result?: string;
}

export interface Checkpoint {
  id: string;
  timestamp: number;
  agentStates: Record<AgentNode, AgentState>;
  activeNode: AgentNode;
}

export interface ResearchSession {
  id: string;
  query: string;
  startedAt: number;
  completedAt?: number;
  status: SessionStatus;
  checkpoints: Checkpoint[];
  finalReport?: string;
}
