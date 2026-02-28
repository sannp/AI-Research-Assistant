import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

// Defines the state structure for our research graph
export const GraphState = Annotation.Root({
    // The original research query
    query: Annotation<string>(),
    // All messages in the thread (Tavily search results, Gemini reasoning, etc.)
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    // Temporary storage for specific agent outputs if needed between nodes
    researchData: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => "",
    }),
    analysisData: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => "",
    }),
    finalReport: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => "",
    }),
});

export type AgentState = typeof GraphState.State;
