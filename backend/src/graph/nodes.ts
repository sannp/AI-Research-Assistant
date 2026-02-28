import { AgentState } from "./state";
import { geminiModel, fastModel } from "../services/gemini";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { tavily } from "@tavily/core";

// Initialize Tavily Client
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

export async function researcherNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("--- RESEARCHER ---");
    const { query } = state;

    try {
        // Perform web search using Tavily
        const searchResponse = await tvly.search(query, {
            searchDepth: "advanced",
            maxResults: 5,
        });

        const resultsString = searchResponse.results
            .map((r: any) => `Source: ${r.url}\nContent: ${r.content}\n`)
            .join("---\n");

        return {
            researchData: resultsString,
            messages: [new SystemMessage(`Research completed. Foundry data:\n${resultsString}`)]
        };
    } catch (error) {
        console.error("Tavily search failed:", error);
        return {
            researchData: "Research failed due to an error.",
            messages: [new SystemMessage("Research failed.")]
        };
    }
}

export async function analystNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("--- ANALYST ---");
    const { query, researchData } = state;

    const prompt = `You are an expert analyst. Your job is to analyze the provided research data 
and structure the findings to directly answer the user's query. Extract key themes, 
evaluate the credibility of the information, and synthesize a comprehensive overview.

User Query: ${query}

Research Data:
${researchData}

Provide a detailed analysis.`;

    // We use the Thinking model here, streaming will be handled at the graph execution level
    const response = await geminiModel.invoke([new HumanMessage(prompt)]);

    return {
        analysisData: response.content as string,
        messages: [response]
    };
}

export async function writerNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log("--- WRITER ---");
    const { query, analysisData } = state;

    const prompt = `You are a professional technical writer and synthesizer. 
Based on the provided analysis, create a final, well-structured, and easy-to-read markdown report 
answering the original query.

Orignal Query: ${query}

Analysis to base report on:
${analysisData}

Write the final report in Markdown. Make it engaging, clear, and comprehensive.`;

    // Fast model since we just need formatting/synthesis, analysis is already done.
    const response = await fastModel.invoke([new HumanMessage(prompt)]);

    return {
        finalReport: response.content as string,
        messages: [response]
    };
}
