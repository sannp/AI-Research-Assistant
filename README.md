# AI Research Assistant: Autonomous Multi-Agent Research Engine

**AI Research Assistant** is a high-performance, real-time research orchestration platform. It moves beyond simple "Chat-with-PDF" apps by deploying a collaborative team of specialized AI agents—**Researcher, Analyst, and Writer**—to execute complex, multi-step web research with high reliability and zero hallucinations.

## The Mission

In 2026, LLMs are only as good as their context. **AI Research Assistant** solves the "Static Knowledge" problem by implementing a stateful, agentic workflow that autonomously browses the live web, verifies facts across multiple sources, and synthesizes structured intelligence in real-time.

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 18 (TS), Vite, Tailwind CSS, Framer Motion, Shadcn UI |
| **Orchestration** | LangGraph, LangChain, Node.js (Express) |
| **Real-time** | Socket.io (WebSockets) |
| **Database** | PostgreSQL (Supabase) via `@langchain/langgraph-checkpoint-postgres` |
| **AI Models** | Google Gemini 2.0 Flash, Tavily Search API |
| **Security** | Zod (Validation), Express-Rate-Limit, Upstash (Redis) |

---

## Key Engineering Features

### Stateful Multi-Agent Orchestration

Unlike linear chains, **AI Research Assistant** uses a **Graph-based state machine** (LangGraph).

* **Cyclic Logic:** If the *Analyst* finds the *Researcher's* data insufficient, the system automatically loops back to gather more context.
* **Persistent Checkpoints:** Every state transition is saved to PostgreSQL. If the server restarts, the research resumes exactly where it left off.

### Real-Time "Thought Trace" Streaming

To solve the "black box" problem of AI, **AI Research Assistant** utilizes **Socket.io** to stream:

* **Internal Monologue:** Granular logs of what the agents are "thinking."
* **Tool Execution:** Live visual feedback of search queries and data extraction steps.
* **Token Streaming:** Final report rendering using a typewriter effect for improved UX.

### Adversarial Defense & Quota Control

Designed for public-facing portfolios with "Safety-by-Design":

* **Prompt Injection Guardrails:** A pre-execution moderation layer filters malicious intent before it reaches the orchestration graph.
* **Dynamic Rate Limiting:** IP-based sliding window counters prevent API exhaustion.
* **Schema Enforcement:** Strict Zod validation ensures the LLM output never breaks the frontend UI.

### Time-Travel Debugging

An interactive UI slider allows users to traverse the agent's history, inspecting the "State" at every node of the research process—a feature critical for auditing AI decision-making.

---

## Repository Structure (Monorepo)

```text
ai-research-assistant/
├── frontend/           # React + Vite Frontend
│   └── src/
│       ├── components/ # Shadcn + Framer Motion UI
│       └── hooks/      # Socket.io & TanStack Query integration
├── backend/           # Node.js + Express + LangGraph
│   ├── agents/       # Agent definitions & tools
│   ├── graph/        # LangGraph state & logic
│   └── index.ts      # WebSocket & API Entry
└── README.md

```

---

## Getting Started

### Prerequisites

* Node.js v20+
* Supabase (PostgreSQL) instance
* API Keys: Gemini (Google AI Studio), Tavily
* Add your keys to .env file

### Installation

1. **Clone the repo:**
```bash
git clone https://github.com/sannp/AI-Research-Assistant.git
```


2. **Setup Backend:**
```bash
cd backend && npm install
npm run dev
```


3. **Setup Frontend:**

```bash
cd frontend && npm install
npm run dev
```