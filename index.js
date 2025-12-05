import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import eventRoutes from "./routes/eventRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import path from "path";





dotenv.config();
const app = express();

app.use(cors({
  origin: "http://localhost:5173", // frontend port
  credentials: true
}));
app.use(express.json());

app.use("/api/events", eventRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", bookingRoutes);

const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));




// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Default route
app.get("/", (req, res) => {
    res.send("Backend is running... hhh");
});

// Listen
app.listen(process.env.PORT || 5000, () => {
    console.log("Server running on port " + process.env.PORT);
});
