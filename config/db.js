/**
 * config/db.js
 * MongoDB connection utility using Mongoose.
 */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expodirectory';

let isConnected = false;

export async function connectDB() {
    if (isConnected) return;

    try {
        const conn = await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        // Don't crash — the server can still work without DB (in-memory cache)
        console.warn('⚠️  Running without database persistence. Data will be lost on restart.');
    }
}

export function getConnectionStatus() {
    return {
        connected: isConnected,
        readyState: mongoose.connection.readyState, // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        uri: MONGODB_URI.replace(/\/\/.*@/, '//***@'), // redact credentials
    };
}
