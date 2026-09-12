// ai-ticket-assistant/src/inngest/functions/resolveTicket.js
import { inngest } from "../client.js";
import ticketRAG from "../../src/rag/ticketrag.js";
import Ticket from "../../models/ticket.js";

/**
 * Trigger when moderator resolves a ticket
 */
export const onTicketResolved = inngest.createFunction(
  { id: "on-ticket-resolved" },
  { event: "tickets/resolved" },
  async ({ event, step }) => {
    const { ticketId, resolution } = event.data;

    await step.run("store-to-vector-db", async () => {
      const ticket = await Ticket.findById(ticketId);
      await ticketRAG.storeResolvedTicket(ticket, resolution);
    });

    return {
      success: true,
      message: `Ticket ${ticketId} stored in knowledge base`
    };
  }
);