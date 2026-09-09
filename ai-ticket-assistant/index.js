// Starts the Express API, connects MongoDB, registers routes, and exposes Inngest functions.

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { serve } from "inngest/express";
import userRoutes from "./routes/user.js";
import ticketRoutes from "./routes/ticket.js";
import { inngest } from "./inngest/client.js";
import { onUserSignup } from "./inngest/functions/on-signup.js";
import { onTicketCreated } from "./inngest/functions/on-ticket-create.js";

import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

// These middleware functions allow browser requests and JSON request bodies.
app.use(cors());
app.use(express.json());

// Mount authentication and ticket endpoints under their shared URL prefixes.
app.use("/api/auth", userRoutes);
app.use("/api/tickets", ticketRoutes);

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [onUserSignup, onTicketCreated],
  })
);

mongoose
  // The HTTP server starts only after the database connection succeeds.
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected ✅");
    app.listen(PORT, () => console.log("🚀 Server at http://localhost:3000"));
  })
  .catch((err) => console.error("❌ MongoDB error: ", err));
