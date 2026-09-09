// Defines authenticated API routes for creating and reading tickets.

import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { createTicket, getTicket, getTickets } from "../controllers/ticket.js";

const router = express.Router();

// Every ticket route requires a valid JWT before reaching its controller.
router.get("/", authenticate, getTickets);
router.get("/:id", authenticate, getTicket);
router.post("/", authenticate, createTicket);

export default router;
