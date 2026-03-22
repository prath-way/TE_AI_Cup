/**
 * queues/enrichmentQueue.js
 * BullMQ Queue for asynchronous bulk company enrichment.
 */
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let connection;
try {
    connection = new IORedis(REDIS_URL, {
        maxRetriesPerRequest: null, // required by BullMQ
        enableReadyCheck: false,
    });
    connection.on('error', (err) => {
        console.warn('⚠️  Redis connection error:', err.message);
    });
} catch (err) {
    console.warn('⚠️  Could not connect to Redis:', err.message);
    connection = null;
}

const enrichmentQueue = connection
    ? new Queue('company-enrichment', {
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { age: 3600, count: 1000 },  // keep for 1 hour or last 1000
            removeOnFail: { age: 86400, count: 5000 },     // keep failures 24h
        },
    })
    : null;

export { connection as redisConnection };
export default enrichmentQueue;
