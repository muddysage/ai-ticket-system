// backend/rag/ticketRAG.js
// RAG implementation using FREE HuggingFace embeddings (NO API KEY NEEDED!)

import { Chroma } from "@langchain/community/vectorstores/chroma";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import dotenv from "dotenv";

dotenv.config();

let vectorStore = null;

/**
 * Initialize Vector Store (run once on startup)
 * Uses FREE HuggingFace embeddings - no API key needed!
 */
export async function initializeVectorStore() {
  try {
    console.log("🚀 Initializing Chroma vector store with HuggingFace embeddings...");
    
    // Use the HuggingFace inference embedding class exposed by the installed community package.
    const embeddings = new HuggingFaceInferenceEmbeddings({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      // This model:
      // - 384-dimensional embeddings
      // - 22MB download
      // - Perfect for semantic search
      // - Completely free
    });

    // Initialize Chroma (in-memory by default)
    vectorStore = new Chroma(embeddings, {
      collectionName: "resolved-tickets"
      // If you want persistent storage, add:
      // url: process.env.CHROMA_URL || "http://localhost:8000"
    });
    
    console.log("✅ Vector store initialized with FREE embeddings!");
    console.log("📍 Using HuggingFace: sentence-transformers/all-MiniLM-L6-v2");
    return vectorStore;
  } catch (error) {
    console.error("❌ Error initializing vector store:", error);
    throw error;
  }
}

/**
 * Store a resolved ticket in vector DB
 * Call this when moderator resolves a ticket
 */
export async function storeResolvedTicket(ticket, resolution) {
  if (!vectorStore) {
    console.warn("⚠️ Vector store not initialized");
    return;
  }

  try {
    const documentContent = `
Title: ${ticket.title}
Description: ${ticket.description}
Category: ${ticket.category}
Priority: ${ticket.priority}
Assigned Skills: ${ticket.requiredSkills?.join(", ") || "N/A"}

Solution Provided:
${resolution.moderatorNotes || ""}

Time to Resolution: ${resolution.resolutionTime || "N/A"}
Rating: ${resolution.userRating || "Unrated"}
    `.trim();

    // Add document to vector store
    await vectorStore.addDocuments([
      {
        pageContent: documentContent,
        metadata: {
          ticketId: ticket._id.toString(),
          category: ticket.category,
          priority: ticket.priority,
          resolvedAt: new Date().toISOString(),
          moderatorId: resolution.moderatorId,
          tags: ticket.tags || []
        }
      }
    ]);

    console.log(`✅ Ticket ${ticket._id} stored in vector DB`);
  } catch (error) {
    console.error("❌ Error storing ticket in vector DB:", error);
  }
}

/**
 * Retrieve similar tickets from knowledge base
 * Returns top N most similar past tickets
 */
export async function findSimilarTickets(query, topK = 3) {
  if (!vectorStore) {
    console.warn("⚠️ Vector store not initialized");
    return [];
  }

  try {
    console.log(`🔍 Searching for similar tickets... (query: "${query.substring(0, 50)}...")`);
    
    const results = await vectorStore.similaritySearchWithScore(query, topK);
    
    const formatted = results.map(([doc, score]) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      relevanceScore: (1 - score).toFixed(2) // Convert distance to similarity (0-1)
    }));

    console.log(`✅ Found ${formatted.length} similar tickets`);
    return formatted;
  } catch (error) {
    console.error("❌ Error retrieving similar tickets:", error);
    return [];
  }
}

/**
 * Enhanced ticket processing with RAG context
 * Used in Inngest event handler
 */
export async function enrichTicketWithRAGContext(ticket) {
  if (!vectorStore) {
    return {
      similarTickets: [],
      ragContext: "",
      hasContext: false
    };
  }

  try {
    // Create search query from ticket
    const searchQuery = `${ticket.title} ${ticket.description}`;
    
    // Find similar tickets
    const similarTickets = await findSimilarTickets(searchQuery, 3);
    
    // Format context for LLM
    const ragContext = similarTickets
      .map((ticket, idx) => {
        return `
Similar Case ${idx + 1} (Relevance: ${ticket.relevanceScore}):
${ticket.content}
---`;
      })
      .join("\n");

    return {
      similarTickets: similarTickets,
      ragContext: ragContext,
      hasContext: similarTickets.length > 0
    };
  } catch (error) {
    console.error("❌ Error enriching ticket with RAG:", error);
    return {
      similarTickets: [],
      ragContext: "",
      hasContext: false
    };
  }
}

/**
 * Generate AI response with RAG context
 * Integrates with Gemini API
 */
export async function generateAIResponseWithRAG(
  ticket,
  ragContext,
  geminiClient
) {
  const prompt = `
You are an intelligent support ticket processor. 

NEW TICKET:
Title: ${ticket.title}
Description: ${ticket.description}

CONTEXT FROM SIMILAR PAST TICKETS:
${ragContext || "No similar past tickets found."}

Based on the new ticket and similar past cases, provide:
1. Category (technical, billing, account, feature-request, etc.)
2. Priority (low, medium, high, critical)
3. Required Skills (comma-separated)
4. Suggested Solution (2-3 sentences based on similar cases)
5. Confidence Score (0-1)

Respond in JSON format only:
{
  "category": "...",
  "priority": "...",
  "requiredSkills": ["...", "..."],
  "suggestedSolution": "...",
  "confidenceScore": 0.XX,
  "reasoning": "..."
}
  `.trim();

  try {
    const response = await geminiClient.generateContent(prompt);
    const jsonResponse = JSON.parse(response.response.text());
    return jsonResponse;
  } catch (error) {
    console.error("❌ Error generating AI response:", error);
    throw error;
  }
}

/**
 * Search tickets by semantic similarity
 * For moderators to find related tickets
 */
export async function semanticTicketSearch(query, topK = 5) {
  if (!vectorStore) {
    return [];
  }

  try {
    console.log(`🔎 Semantic search for: "${query}"`);
    
    const results = await vectorStore.similaritySearchWithScore(query, topK);
    
    return results.map(([doc, score]) => ({
      id: doc.metadata.ticketId,
      content: doc.pageContent,
      relevance: (1 - score).toFixed(2),
      resolvedAt: doc.metadata.resolvedAt,
      category: doc.metadata.category
    }));
  } catch (error) {
    console.error("❌ Error in semantic search:", error);
    return [];
  }
}

export default {
  initializeVectorStore,
  storeResolvedTicket,
  findSimilarTickets,
  enrichTicketWithRAGContext,
  generateAIResponseWithRAG,
  semanticTicketSearch
};