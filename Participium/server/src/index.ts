import {app}  from "@app";
import { CONFIG } from "@config";
import { initializeDatabase, initializeRedis } from "@database";
import * as fs from "node:fs";
import * as path from "node:path";
import * as http from "node:http";
import { Server as IOServer, Socket } from "socket.io";
import { setIO } from "@services/ioService";

let server;

async function startServer() {
  try {
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, "../uploads/reports");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log("Created uploads directory:", uploadsDir);
    }

    //? Ensure avatars directory exists (as for reports, but for story 9)
    const avatarsDir = path.join(__dirname, "../uploads/avatars");
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
      console.log("Created uploads directory:", avatarsDir);
    }

    await initializeDatabase();
    await initializeRedis();

    // Create HTTP server and attach Socket.IO
    const httpServer = http.createServer(app);
    const io = new IOServer(httpServer, { 
      cors: { 
        origin: [
          "http://localhost:5173",
          "http://127.0.0.1:5173",
          "http://localhost:1574",
          "http://127.0.0.1:1574",
          "http://localhost:5174",
          "http://127.0.0.1:5174"
        ],
        credentials: true
      } 
    });
    setIO(io);

    io.on("connection", (socket: Socket) => {
      console.log("Client connected:", socket.id);
      socket.on("join-report", (reportId: number) => {
        socket.join(`report:${reportId}`);
        console.log(`Socket ${socket.id} joined report:${reportId}`);
      });
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    httpServer.listen(CONFIG.APP_PORT);
    console.log("Server Started on port", CONFIG.APP_PORT);
    
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();