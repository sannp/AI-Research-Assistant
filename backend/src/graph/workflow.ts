import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState } from "./state";
import { researcherNode, analystNode, writerNode } from "./nodes";
import { checkpointer } from "../services/supabase";

// Define the logic mapping our nodes
const workflow = new StateGraph(GraphState)
    .addNode("researcher", researcherNode)
    .addNode("analyst", analystNode)
    .addNode("writer", writerNode)
    .addEdge(START, "researcher")
    .addEdge("researcher", "analyst")
    .addEdge("analyst", "writer")
    .addEdge("writer", END);

// Compile the graph, attaching the Postgres checkpointer for persistent state tracking 
export const app = workflow.compile({ checkpointer });
