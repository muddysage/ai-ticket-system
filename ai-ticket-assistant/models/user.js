// Defines the MongoDB schema for users, roles, authentication data, and skills.

import mongoose from "mongoose";

// The role determines which backend resources a user can access.
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user", enum: ["user", "moderator", "admin"] },
  skills: [String],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
