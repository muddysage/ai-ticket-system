// Defines the MongoDB schema for support tickets and their AI-generated metadata.

import mongoose from "mongoose";

// References connect tickets to the users who created or received them.
const ticketSchema = new mongoose.Schema({
  title: String,
  description: String,
  status: { type: String, default: "TODO" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  category: {
    type: String,
    default: "general",
  },

  requiredSkills: [String],

  suggestedSolution: {
    type: String,
    default: null,
  },

  confidenceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
  },

  similarTickets: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
    },
  ],

  resolutionNotes: {
    type: String,
    default: null,
  },
  priority: String,
  deadline: Date,
  helpfulNotes: String,
  relatedSkills: [String],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Ticket", ticketSchema);
