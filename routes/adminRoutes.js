import express from "express";
import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

// 🔹 Admin Registration (optional, one-time)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: "Admin already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const admin = new Admin({ name, email, password: hashed });
    await admin.save();

    res.status(201).json({ success: true, message: "Admin created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🔹 Admin Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // DEBUG: check what is coming from frontend
    console.log("Login attempt:", email, password);

    const admin = await Admin.findOne({ email });
    console.log("Admin found:", admin ? admin.email : "NOT FOUND");

    if (!admin) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, admin.password);
    console.log("Password match:", match);

    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin._id, isAdmin: admin.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("Token generated:", token.substring(0, 10) + "..."); // debug
    res.status(200).json({ success: true, token });
  } catch (err) {
    console.log("Login error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});



export default router;
