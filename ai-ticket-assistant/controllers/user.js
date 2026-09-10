// Contains the request handlers for signup, login, logout, and user administration.

import brcypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { inngest } from "../inngest/client.js";

export const signup = async (req, res) => {
  // Creates a public user account. Role and skills must be assigned later by an admin-only workflow.
  const { email, password } = req.body;

  if (!email || !password || password.length < 6) {
    return res
      .status(400)
      .json({ error: "Email and a password of at least 6 characters are required" });
  }

  try {
    const hashed = await brcypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashed,
      skills: [],
      role: "user",
    });

    try {
      await inngest.send({
        name: "user/signup",
        data: {
          email,
        },
      });
    } catch (error) {
      console.error("Welcome email event could not be sent:", error.message);
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role },//payload:This payload contains only the user identity information the backend wants to trust later.
      process.env.JWT_SECRET//Sign it using a secret key
    );

    const plainUser = {
      _id: user._id,
      email: user.email,
      role: user.role,
      skills: user.skills,
      createdAt: user.createdAt,
    };

    return res.json({ user: plainUser, token });

  } catch (error) {
    return res
      .status(500)
      .json({ error: "Signup failed", details: error.message });
  }
};

export const login = async (req, res) => {
  // Verifies credentials and returns a JWT containing the user's identity and role.
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "User not found" });

    if (role && user.role !== role) {
      return res.status(403).json({ error: "Role not authorized for this account" });
    }

    const isMatch = await brcypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    const plainUser = {
      _id: user._id,
      email: user.email,
      role: user.role,
      skills: user.skills,
      createdAt: user.createdAt,
    };

    return res.json({ user: plainUser, token });
  } catch (error) {
    return res.status(500).json({ error: "Login failed", details: error.message });
  }
};

export const logout = async (req, res) => {
  // Verifies the supplied token; the frontend completes logout by clearing local storage.
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorzed" });
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ error: "Unauthorized" });
    });
    res.json({ message: "Logout successfully" });
  } catch (error) {
    res.status(500).json({ error: "Login failed", details: error.message });
  }
};

export const updateUser = async (req, res) => {
  // Allows only administrators to change a user's role and skills.
  const { skills = [], role, email } = req.body;
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ eeor: "Forbidden" });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "User not found" });

    await User.updateOne(
      { email },
      { skills: skills.length ? skills : user.skills, role }
    );
    return res.json({ message: "User updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Update failed", details: error.message });
  }
};

export const getUsers = async (req, res) => {
  // Returns users without password fields for the administrator panel.
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const users = await User.find().select("-password");
    return res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Update failed", details: error.message });
  }
};
