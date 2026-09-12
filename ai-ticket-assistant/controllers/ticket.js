// Contains the request handlers for creating and retrieving support tickets.

import { inngest } from "../inngest/client.js";
import Ticket from "../models/ticket.js";

export const createTicket = async (req, res) => {
  // Creates the initial ticket and starts asynchronous AI processing.
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    const newTicket = await Ticket.create({
      title,
      description,
      createdBy: req.user._id,
    });

    await inngest.send({
      name: "ticket/created",
      data: {
        ticketId: newTicket._id.toString(),
        title,
        description,
        createdBy: req.user._id.toString(),
      },
    });

    return res.status(201).json({
      message: "Ticket created and processing started",
      ticket: newTicket,
    });
  } catch (error) {
    console.error("Error creating ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTickets = async (req, res) => {
  try {
    const user = req.user;
    let tickets = [];

    if (user.role === "admin") {
      tickets = await Ticket.find({})
        .populate("assignedTo", ["email", "_id"])
        .sort({ createdAt: -1 });
    } else if (user.role === "moderator") {
      tickets = await Ticket.find({ assignedTo: user._id })
        .populate("assignedTo", ["email", "_id"])
        .sort({ createdAt: -1 });
    } else {
      tickets = await Ticket.find({ createdBy: user._id })
        .select("title description status createdAt")
        .sort({ createdAt: -1 });
    }

    return res.status(200).json({ tickets });
  } catch (error) {
    console.error("Error fetching tickets", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTicket = async (req, res) => {
  try {
    const user = req.user;
    let ticket;

    if (user.role === "admin") {
      ticket = await Ticket.findById(req.params.id)
        .populate("assignedTo", ["email", "_id"])
        .populate("similarTickets", ["title", "_id"]);
    } else if (user.role === "moderator") {
      ticket = await Ticket.findOne({
        _id: req.params.id,
        assignedTo: user._id,
      })
        .populate("assignedTo", ["email", "_id"])
        .populate("similarTickets", ["title", "_id"]);
    } else {
      ticket = await Ticket.findOne({
        createdBy: user._id,
        _id: req.params.id,
      })
        .populate("assignedTo", ["email", "_id"])
        .populate("similarTickets", ["title", "_id"])
        .select(
          "title description status createdAt priority helpfulNotes relatedSkills assignedTo similarTickets suggestedSolution confidenceScore"
        );
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.status(200).json({ ticket });
  } catch (error) {
    console.error("Error fetching ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resolveTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { moderatorNotes, userRating } = req.body;

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const finalSolution = moderatorNotes || ticket.suggestedSolution || "Ticket resolved.";

    await inngest.send({
      name: "tickets/resolved",
      data: {
        ticketId: id,
        resolution: {
          moderatorNotes: finalSolution,
          userRating,
          resolutionTime: new Date() - ticket.createdAt,
          moderatorId: req.user._id,
        },
      },
    });

    await Ticket.findByIdAndUpdate(id, {
      status: "resolved",
      resolutionNotes: finalSolution,
      suggestedSolution: finalSolution,
    });

    return res.json({
      success: true,
      message: "Ticket resolved and stored in knowledge base",
    });
  } catch (error) {
    console.error("Error resolving ticket:", error);
    return res.status(500).json({ error: error.message });
  }
};
