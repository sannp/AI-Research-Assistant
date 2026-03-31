import express, { Request, Response } from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { setupSocketStream, ClientEvents, ServerEvents } from "./socket/stream";
import { pool, checkpointer } from "./services/supabase";

dotenv.config();

const PORT = process.env.PORT || 3000;
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
const healthHandler = async (req: Request, res: Response) => {
    let dbStatus = "unknown";
    try {
        await pool.query('SELECT 1');
        dbStatus = "connected";
    } catch (error) {
        dbStatus = "disconnected";
    }

    res.status(200).json({
        status: "OK",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: dbStatus,
        port: PORT
    });
};

app.get("/health", healthHandler);

// Setup Socket Streaming Logic
setupSocketStream(io);

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
