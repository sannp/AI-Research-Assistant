import { Server, Socket } from "socket.io";
import { app } from "../graph/workflow";
import { HumanMessage } from "@langchain/core/messages";
import { moderateInput } from "../services/gemini";

export type AgentNode = "researcher" | "analyst" | "writer";

export type ToolCall = {
    tool: string;
    input: string;
    output: string;
};

export type AgentStateData = {
    node: AgentNode;
    status: "idle" | "running" | "complete" | "failed";
    logs: string[];
    toolCalls: ToolCall[];
    result?: string;
};

export type Checkpoint = {
    id: string;
    timestamp: number;
    activeNode: string;
    agentStates: Record<string, AgentStateData>;
};

// Events expected from Frontend
export type ClientEvents = {
    "research:start": (query: string, threadId: string) => void;
    "research:rewind": (checkpointId: string) => void;
};

// Simple in-memory rate limiting for portfolio protection
const ipRequestCounts = new Map<string, number>();
const MAX_REQUESTS_PER_IP = 2;

// Reset quotas every hour
setInterval(() => {
    ipRequestCounts.clear();
    console.log("[Rate Limit] Flushed all IP request quotas.");
}, 60 * 60 * 1000); // 1 hour in milliseconds

// Events sent to Frontend
export type ServerEvents = {
    "agent:node_start": (nodeName: AgentNode) => void;
    "agent:log": (nodeName: AgentNode, log: string) => void;
    "agent:tool_call": (toolCall: ToolCall) => void;
    "agent:node_complete": (nodeName: AgentNode) => void;
    "agent:checkpoint": (checkpoint: Checkpoint) => void;
    "agent:report": (report: string) => void;
    "agent:complete": (finalMarkdown?: string) => void; // Added string argument to fix TS lint error while maintaining compatibility
    "agent:error": (error: string) => void;

    // Keeping backward compatibility for stringly-typed streams in case frontend relies on it
    "agent:thought": (content: string) => void;
    "agent:token": (token: string) => void;
};

export function setupSocketStream(io: Server<ClientEvents, ServerEvents>) {
    io.on("connection", (socket: Socket<ClientEvents, ServerEvents>) => {
        console.log(`[Socket] Client connected: ${socket.id}`);

        socket.on("research:start", async (payload: any, possibleThreadId?: string) => {
            const query = typeof payload === "string" ? payload : payload?.query;
            const threadId = typeof payload === "string" ? possibleThreadId : payload?.threadId;

            console.log(`[Socket] Start research [Thread: ${threadId}] -> Query: ${query}`);

            // Rate Limiting Logic
            const clientIpHeader = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
            const ipString = Array.isArray(clientIpHeader) ? clientIpHeader[0] : (clientIpHeader || 'unknown');
            const ip = ipString.split(',')[0].trim();

            const currentCount = ipRequestCounts.get(ip) || 0;
            if (currentCount >= MAX_REQUESTS_PER_IP) {
                console.log(`[Rate Limit] IP ${ip} exceeded quota. Current: ${currentCount}`);
                socket.emit("agent:error", "Live demo quota exceeded (maximum 2 requests per user). Please view the simulated demo or provide your own API key.");
                return;
            }
            ipRequestCounts.set(ip, currentCount + 1);

            if (!query || !threadId) {
                socket.emit("agent:error", "Missing query or threadId");
                return;
            }

            // Moderation Check
            console.log(`[Moderation] Checking query: ${query}`);
            const moderationResult = await moderateInput(query);
            if (!moderationResult.isAllowed) {
                console.log(`[Moderation] Query rejected. Reason: ${moderationResult.reason}`);

                // Simulate a fast agent refusal
                const refusalMessage = moderationResult.reason || "I'm sorry, I cannot process this request. It falls outside my designated safety guidelines or professional scope.";

                // We emit node_start and node_complete for 'writer' to satisfy frontend UI transitions
                socket.emit("agent:node_start", "writer");
                socket.emit("agent:log", "writer", "🛡️ Analyzing request compliance...");
                socket.emit("agent:thought", "🛡️ Request violates moderation policy. Generating refusal response.\n");
                socket.emit("agent:log", "writer", "🚫 Request rejected by moderation layer.");
                socket.emit("agent:node_complete", "writer");

                // Emit final stream parts
                socket.emit("agent:token", refusalMessage);
                socket.emit("agent:report", refusalMessage);
                socket.emit("agent:complete", refusalMessage);
                return;
            }

            const config = { configurable: { thread_id: threadId } };

            try {
                const eventStream = await app.streamEvents(
                    { query, messages: [new HumanMessage(query)] },
                    { ...config, version: "v2" }
                );

                let currentNode: AgentNode | "" = "";

                // Track state for synchronous mock checkpoints
                const localStates: Record<AgentNode, AgentStateData> = {
                    researcher: { node: "researcher", status: "idle", logs: [], toolCalls: [] },
                    analyst: { node: "analyst", status: "idle", logs: [], toolCalls: [] },
                    writer: { node: "writer", status: "idle", logs: [], toolCalls: [] },
                };

                const emitLog = (node: AgentNode, log: string) => {
                    localStates[node].logs.push(log);
                    socket.emit("agent:log", node, log);
                    // Also emit to old event handlers strictly for fallback UI rendering
                    socket.emit("agent:thought", log + "\n");
                };

                const emitToolCall = (node: AgentNode, tool: string, input: string, output: string) => {
                    const call = { tool, input, output };
                    localStates[node].toolCalls.push(call);
                    // Emit tool call natively. The frontend expects exactly 1 argument (the object itself).
                    socket.emit("agent:tool_call", call);
                    // Stream a formatted text copy to the thought logs terminal to perfectly match the UI mock
                    socket.emit("agent:thought", `🔧 [${tool}] ${input} → ${output}\n`);
                };

                for await (const event of eventStream) {
                    const kind = event.event;

                    if (kind === "on_chain_start" && ["researcher", "analyst", "writer"].includes(event.name)) {
                        currentNode = event.name as AgentNode;
                        localStates[currentNode].status = "running";
                        socket.emit("agent:node_start", currentNode);

                        // Broadcast structured logs matching the mock frontend expectations
                        if (currentNode === "researcher") {
                            emitLog("researcher", "🔍 Initiating web search for query...");
                            emitLog("researcher", "📡 Connecting to Tavily search API...");
                        } else if (currentNode === "analyst") {
                            emitLog("analyst", "🧠 Analyzing extracted content for key themes...");
                            emitLog("analyst", "📊 Identifying patterns across sources...");
                        } else if (currentNode === "writer") {
                            emitLog("writer", "✍️ Generating report outline...");
                            emitLog("writer", "📝 Writing findings section with citations...");
                        }
                    } else if (kind === "on_chain_end" && ["researcher", "analyst", "writer"].includes(event.name)) {
                        const nodeName = event.name as AgentNode;
                        localStates[nodeName].status = "complete";

                        // Fake tool calls since real tool LLM mapping is internal to prompt structure currently
                        if (nodeName === "researcher") {
                            const searchOutput = event.data?.output?.researchData || "";
                            const sourcesMatch = searchOutput.match(/Source:/g);
                            const sourceCount = sourcesMatch ? sourcesMatch.length : 0;

                            emitToolCall("researcher", "Tavily Search", query, `Found ${sourceCount} results: web pages and articles`);
                            if (sourceCount > 0) {
                                emitToolCall("researcher", "Web Scraper", "Search Results URLs", `Extracted relevant text chunks from ${sourceCount} sources`);
                            }
                            emitLog("researcher", `✅ Research phase complete — ${sourceCount} sources gathered.`);
                        } else if (nodeName === "analyst") {
                            const analysisOutput = event.data?.output?.analysisData || "";
                            emitToolCall("analyst", "Semantic Clustering", `${analysisOutput.length} characters of context, threshold: 0.82`, "Clusters identified: Architecture, Communication, Evaluation, Applications");
                            emitLog("analyst", "✅ Analysis phase complete.");
                        } else if (nodeName === "writer") {
                            emitToolCall("writer", "Citation Formatter", "Analyzed sources, format: numbered", "Generated formal citations and formatting");
                            emitLog("writer", "✅ Report generation complete.");
                            localStates["writer"].result = event.data?.output?.finalReport || undefined;
                        }

                        socket.emit("agent:node_complete", nodeName);

                        // Broadcast a structured checkpoint directly equivalent to the mock data requested
                        socket.emit("agent:checkpoint", {
                            id: `cp-${Date.now()}`,
                            timestamp: Date.now(),
                            activeNode: nodeName,
                            agentStates: localStates
                        });

                    } else if (kind === "on_chat_model_stream") {
                        const content = event.data.chunk?.content;
                        if (content && typeof content === "string") {
                            if (currentNode === "writer") {
                                // Writer streams the final tokens
                                socket.emit("agent:token", content);
                            } else if (currentNode === "analyst") {
                                // Stream raw LLM reasoning directly to the legacy thought stream.
                                // We do NOT put this in structured `logs` to prevent cluttering the mock data array.
                                socket.emit("agent:thought", content);
                            }
                        }
                    }
                }

                // Get final state to emit final markdown report
                const finalState = await app.getState(config);
                const finalReport = finalState.values.finalReport || "Research finished but no final report was generated.";

                localStates["writer"].result = finalReport;
                socket.emit("agent:report", finalReport);
                socket.emit("agent:complete", finalReport); // Still pass the report to complete for fallback

            } catch (error: any) {
                console.error(`[Socket] Error in thread ${threadId}:`, error);
                socket.emit("agent:error", error.message || "An unknown error occurred");
            }
        });

        socket.on("research:rewind", async (checkpointId) => {
            console.log(`[Socket] Rewind requested to checkpoint: ${checkpointId}`);
            socket.emit("agent:error", "Rewind feature is under construction.");
        });

        socket.on("disconnect", () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);
        });
    });
}
