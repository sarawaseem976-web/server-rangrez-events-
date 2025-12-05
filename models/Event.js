import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },

    // Event date
    date: { type: String, required: true },

    // New fields
    category: { type: String },
    address: { type: String },
    location: { type: String },          // <-- New location field
    standardPrice: { type: String },
    vipPrice: { type: String },
    eventTime: { type: String },  // Example: "7:00 PM - 10:00 PM"

    refreshments: { type: String }, // optional

    // sponsor logos (multiple images)
    sponsorLogos: [{ type: String }],

    // Event main image
    imageUrl: { type: String },

    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
