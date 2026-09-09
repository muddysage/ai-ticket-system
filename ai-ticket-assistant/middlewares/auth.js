// Authenticates requests by verifying the JWT in the Authorization header.

import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  // Extract the token from the standard "Bearer <token>" header format.
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access Denied. No token found." });
  }

  try {
    // Store the decoded user identity so controllers can enforce access rules.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};
