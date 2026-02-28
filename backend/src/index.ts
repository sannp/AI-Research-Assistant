import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { setupSocketStream, ClientEvents, ServerEvents } from "./socket/stream";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Setup Socket.io Server
const io = new Server<ClientEvents, ServerEvents>(server, {
    cors: {
        origin: "*", // Adjust in production
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());

// Health Check Endpoint (Required for Render.io)
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", port: PORT });
});

import { checkpointer } from "./services/supabase";

// Setup Socket Streaming Logic
setupSocketStream(io);

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Initialize LangGraph checkpointer (creates tables if missing)
        console.log("[Server] Initializing checkpointer...");
        await checkpointer.setup();

        server.listen(PORT, () => {
            console.log(`[Server] Running on port ${PORT}`);
            console.log(`[Server] Health check at http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error("[Server] Failed to initialize checkpointer:", error);
        process.exit(1);
    }
}

startServer();
