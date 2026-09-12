import { inngest } from "../client.js";
import Ticket from "../../models/ticket.js";
import User from "../../models/user.js";
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";
import analyzeTicket from "../../utils/ai.js";
import ticketRAG from "../../src/rag/ticketrag.js";

export const onTicketCreated = inngest.createFunction(
  { id: "on-ticket-created", retries: 2 },
  { event: "ticket/created" },
  async ({ event, step }) => {
    try {
      const { ticketId } = event.data;

      const ticket = await step.run("fetch-ticket", async () => {
        const ticketObject = await Ticket.findById(ticketId);
        if (!ticketObject) {
          throw new NonRetriableError("Ticket not found");
        }
        return ticketObject;
      });

      await step.run("update-ticket-status", async () => {
        await Ticket.findByIdAndUpdate(ticket._id, { status: "TODO" });
      });

      const ragData = await step.run("retrieve-rag-context", async () => {
        return await ticketRAG.enrichTicketWithRAGContext({
          title: ticket.title,
          description: ticket.description,
          category: ticket.category || "general",
        });
      });

      const aiAnalysis = await step.run("analyze-ticket", async () => {
        return await analyzeTicket({
          title: ticket.title,
          description: ticket.description,
        });
      });

      const moderator = await step.run("assign-moderator", async () => {
        const skills = aiAnalysis?.relatedSkills || [];
        let user = await User.findOne({
          role: "moderator",
          skills: { $in: skills },
        });

        if (!user) {
          user = await User.findOne({ role: "admin" });
        }

        return user;
      });

      await step.run("update-ticket", async () => {
        const similarTicketIds = ragData.similarTickets.map((match) => {
          return match?.metadata?.ticketId || match?.id || null;
        }).filter(Boolean);

        await Ticket.findByIdAndUpdate(ticket._id, {
          priority: aiAnalysis?.priority || "medium",
          helpfulNotes: aiAnalysis?.helpfulNotes || "",
          relatedSkills: aiAnalysis?.relatedSkills || [],
          suggestedSolution: aiAnalysis?.helpfulNotes || aiAnalysis?.summary || "",
          confidenceScore: ragData.hasContext ? 0.75 : 0.5,
          similarTickets: similarTicketIds,
          assignedTo: moderator?._id || process.env.ADMIN_ID || null,
          status: "assigned",
        });
      });

      await step.run("send-email-notification", async () => {
        if (moderator) {
          const emailContent = `
New Ticket: ${ticket.title}

Description: ${ticket.description}

Priority: ${aiAnalysis?.priority || "medium"}
Skills: ${(aiAnalysis?.relatedSkills || []).join(", ")}

AI Suggested Solution:
${aiAnalysis?.helpfulNotes || aiAnalysis?.summary || "No analysis found"}

Confidence: ${ragData.hasContext ? "75.0%" : "50.0%"}

${ragData.similarTickets.length > 0 ? "Similar Past Cases Found (for reference)." : ""}

View: ${process.env.APP_URL}/tickets/${ticket._id}
          `;

          await sendMail(
            moderator.email,
            `[${(aiAnalysis?.priority || "medium").toUpperCase()}] ${ticket.title}`,
            emailContent
          );
        }
      });

      return {
        success: true,
        ticketId: ticket._id,
        ragContextUsed: ragData.hasContext,
        similarTicketsFound: ragData.similarTickets.length,
      };
    } catch (err) {
      console.error("❌ Error running the step", err.message);
      return { success: false };
    }
  }
);

export default onTicketCreated;