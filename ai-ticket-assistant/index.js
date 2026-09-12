import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { serve } from "inngest/express";
import userRoutes from "./routes/user.js";
import ticketRoutes from "./routes/ticket.js";
import { inngest } from "./inngest/client.js";
import { onUserSignup } from "./inngest/functions/on-signup.js";
import { onTicketCreated } from "./inngest/functions/on-ticket-create.js";
import { onTicketResolved } from "./inngest/functions/resolveticket.js";
import ticketRAG from "./src/rag/ticketrag.js";

import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", userRoutes);
app.use("/api/tickets", ticketRoutes);

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [onUserSignup, onTicketCreated, onTicketResolved],
  })
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected ✅");
    // Initialize RAG system first
    const startServer = async () => {
      try {
        await ticketRAG.initializeVectorStore();
        
        app.listen(PORT, () => {
          console.log(`✅ Server running on port ${PORT}`);
          console.log(`📍 RAG System: Ready`);
        });
      } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
      }
    };

    startServer();
  })
  .catch((err) => console.error("❌ MongoDB error: ", err));