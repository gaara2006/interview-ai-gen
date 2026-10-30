const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MongoDB Connection Failed: MONGO_URI is not configured.");
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB connection temporarily disconnected; the driver will attempt to reconnect.");
  });
  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB connection restored.");
  });
  mongoose.connection.on("error", (error) => {
    // Do not log the connection URI because it may contain credentials.
    console.error("MongoDB connection event:", error.name || "DatabaseError", error.code || "");
  });

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // Keep TLS verification enabled. mongodb+srv:// Atlas URIs enable TLS by default.
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 0,
      retryReads: true,
      retryWrites: true,
    });
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.name || "DatabaseError", error.code || "", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
