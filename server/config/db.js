import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_energy_meter';
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return true;
  } catch (error) {
    isConnected = false;
    console.warn(`[MongoDB] Warning: Could not connect to MongoDB at ${uri}.`);
    console.warn(`[MongoDB] Note: To use MongoDB Atlas, set MONGODB_URI in server/.env (e.g. mongodb+srv://<user>:<password>@cluster0.mongodb.net/smart_energy_meter)`);
    console.warn(`[MongoDB] The backend will run with the in-memory fallback store so ESP32 data ingestion & WebSockets work without interruption!`);
    return false;
  }
};

export const getDbStatus = () => isConnected;
