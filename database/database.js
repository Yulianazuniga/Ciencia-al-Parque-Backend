import mongoose from "mongoose";
import { MONGODB_URI } from "../config/databaseCredentials.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("DB connection established");
  } catch (error) {
    console.error("DB connection error:", error.message);
    process.exit(1);
  }
};
