import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Booking from "../models/Booking.js";
import nodemailer from "nodemailer";
import QRCode from "qrcode";

const router = express.Router();

// Fix dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads folder exists
const receiptsPath = path.join(__dirname, "../uploads/receipts");
if (!fs.existsSync(receiptsPath)) {
  fs.mkdirSync(receiptsPath, { recursive: true });
  console.log("📂 receipts folder created");
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, receiptsPath);
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

/* ----------------------------------------------------
    CREATE BOOKING
---------------------------------------------------- */
router.post("/booking/create", upload.single("receiptImage"), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      contactNumber,
      emailAddress,
      cityName,
      ticketType,
      eventId,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Receipt upload is required" });
    }

    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }

    // Generate random ticket number
    const ticketNumber = Math.floor(100000 + Math.random() * 900000);

    const newBooking = new Booking({
      firstName,
      lastName,
      contactNumber,
      emailAddress,
      cityName,
      ticketType,
      eventId,
      ticketNumber,
      receiptImage: `/uploads/receipts/${req.file.filename}`,
    });

    await newBooking.save();

    res.status(201).json({
      message: "Booking created successfully",
      newBooking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Booking failed", error });
  }
});

/* ----------------------------------------------------
    GET ALL BOOKINGS
---------------------------------------------------- */
router.get("/booking", async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("eventId")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

/* ----------------------------------------------------
    GET SINGLE BOOKING
---------------------------------------------------- */
router.get("/booking/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("eventId");

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch booking" });
  }
});

/* ----------------------------------------------------
    DELETE BOOKING
---------------------------------------------------- */
router.delete("/booking/:id", async (req, res) => {
  try {
    const booking = await Booking.findByBy(req.params.id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    await booking.deleteOne();
    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete booking" });
  }
});

/* ----------------------------------------------------
    UPDATE BOOKING STATUS
---------------------------------------------------- */
router.put("/booking/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body;

    const allowed = ["Pending", "Paid", "Unpaid", "Cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({
      message: "Status updated successfully",
      booking: updated,
    });
  } catch (error) {
    console.error("Status Update Error:", error);
    res.status(500).json({ message: "Failed to update status", error });
  }
});

/* ----------------------------------------------------
    VERIFY BY QR (ticketNumber)
---------------------------------------------------- */
router.get("/booking/verify/:ticketNumber", async (req, res) => {
  try {
    const ticketNumber = req.params.ticketNumber;

    const booking = await Booking.findOne({ ticketNumber }).populate("eventId");

    if (!booking) {
      return res.status(404).json({
        valid: false,
        message: "Invalid ticket. No matching record found.",
      });
    }

    res.json({
      valid: true,
      message: "Ticket is valid",
      booking,
    });
  } catch (error) {
    console.error("QR Verification Error:", error);
    res.status(500).json({ message: "Verification failed", error });
  }
});

/* ----------------------------------------------------
    SEND EMAIL WITH TICKET + QR CODE
---------------------------------------------------- */
router.post("/booking/send-email/:id", async (req, res) => {
  try {
    const { subject, message, htmlContent } = req.body;

    if (!htmlContent) {
      return res.status(400).json({ message: "htmlContent is required" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    /* ----------------------------------------------------
        GENERATE QR CODE
    ---------------------------------------------------- */
    const verificationURL = `http://your-domain.com/verify-ticket/${booking.ticketNumber}`;

    const qrCodeDataURL = await QRCode.toDataURL(verificationURL, {
      errorCorrectionLevel: "H",
      type: "image/png",
      margin: 1,
      width: 300,
    });

    /* ----------------------------------------------------
        Replace {{QR_CODE}} placeholder in HTML
    ---------------------------------------------------- */
    const finalHTML = htmlContent.replace("{{QR_CODE}}", qrCodeDataURL);

    /* ----------------------------------------------------
        SEND EMAIL
    ---------------------------------------------------- */
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Event Ticket" <${process.env.EMAIL_USER}>`,
      to: booking.emailAddress,
      subject: subject || "Your Ticket",
      text: message || "Here is your ticket",
      html: finalHTML,
    });

    res.json({
      message: "Email sent successfully",
      qrCode: qrCodeDataURL,
      verifyLink: verificationURL,
    });
  } catch (error) {
    console.error("Email Error:", error);
    res.status(500).json({ message: "Email sending failed", error });
  }
});

export default router;
