import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err));

export const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log('✅ Redis Connected Successfully');
    }
};

// Push Post ID to global feed timeline cache
export const cachePostInFeed = async (postId: string) => {
    try {
        // Keeps the latest 100 post IDs in a fast Redis List
        await redisClient.lPush('feed:global', postId);
        await redisClient.lTrim('feed:global', 0, 99);
    } catch (error) {
        console.error('Failed to cache post in Redis:', error);
    }
};

// Increment like counter instantly in memory
export const incrementLikeCounter = async (postId: string) => {
    try {
        await redisClient.hIncrBy('post:likes', postId, 1);
    } catch (error) {
        console.error('Failed to increment like counter in Redis:', error);
    }
};