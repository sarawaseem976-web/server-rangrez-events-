import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import Event from "../models/Event.js";
import { authAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

// Handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, "../uploads");
const sponsorDir = path.join(uploadsDir, "sponsors");

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(sponsorDir)) fs.mkdirSync(sponsorDir);

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "imageUrl") {
      cb(null, uploadsDir);
    } else if (file.fieldname === "sponsorLogos") {
      cb(null, sponsorDir);
    } else {
      cb(new Error("Unexpected field"));
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// -----------------------------
// Create Event
// -----------------------------
router.post(
  "/add",
  authAdmin,
  upload.fields([
    { name: "imageUrl", maxCount: 1 },
    { name: "sponsorLogos", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const {
        title,
        description,
        date,
        location,
        category,
        address,
        standardPrice,
        vipPrice,
        eventTime,
        refreshments,
      } = req.body;

      const newEvent = new Event({
        title,
        description,
        date,
        location,
        category,
        address,
        standardPrice,
        vipPrice,
        eventTime,
        refreshments,
        imageUrl: req.files.imageUrl
          ? `/uploads/${req.files.imageUrl[0].filename}`
          : "",
        sponsorLogos: req.files.sponsorLogos
          ? req.files.sponsorLogos.map((file) => `/uploads/sponsors/${file.filename}`)
          : [],
      });

      const savedEvent = await newEvent.save();
      res.status(201).json(savedEvent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create event" });
    }
  }
);

// -----------------------------
// Get all events
// -----------------------------
router.get("/", async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch events" });
  }
});

// -----------------------------
// Get single event by ID
// -----------------------------
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/))
      return res.status(400).json({ message: "Invalid event ID" });

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch event" });
  }
});

// -----------------------------
// Update Event
// -----------------------------
router.put(
  "/:id",
  authAdmin,
  upload.fields([
    { name: "imageUrl", maxCount: 1 },
    { name: "sponsorLogos", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!id.match(/^[0-9a-fA-F]{24}$/))
        return res.status(400).json({ message: "Invalid event ID" });

      const event = await Event.findById(id);
      if (!event) return res.status(404).json({ message: "Event not found" });

      const {
        title,
        description,
        date,
        location,
        category,
        address,
        standardPrice,
        vipPrice,
        eventTime,
        refreshments,
      } = req.body;

      event.title = title || event.title;
      event.description = description || event.description;
      event.date = date || event.date;
      event.location = location || event.location;
      event.category = category || event.category;
      event.address = address || event.address;
      event.standardPrice = standardPrice || event.standardPrice;
      event.vipPrice = vipPrice || event.vipPrice;
      event.eventTime = eventTime || event.eventTime;
      event.refreshments = refreshments || event.refreshments;

      if (req.files.imageUrl) {
        event.imageUrl = `/uploads/${req.files.imageUrl[0].filename}`;
      }

      if (req.files.sponsorLogos) {
        event.sponsorLogos = req.files.sponsorLogos.map(
          (file) => `/uploads/sponsors/${file.filename}`
        );
      }

      const updatedEvent = await event.save();
      res.json(updatedEvent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update event" });
    }
  }
);

// -----------------------------
// Delete Event
// -----------------------------
router.delete("/:id", authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/))
      return res.status(400).json({ message: "Invalid event ID" });

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    await event.deleteOne();
    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete event" });
  }
});

export default router;
