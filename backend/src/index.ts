import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import uploadRouter from './upload';
import { connectKafkaProducer, publishEvent } from './kafka';
import { startKafkaConsumers } from './Consumers';
import { connectRedis, redisClient } from './redis';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/upload', uploadRouter);

// 1. Health Check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'OK', service: 'ChainSphere API' });
});

// 2. User Registration / Wallet Link
app.post('/api/users', async (req: Request, res: Response) => {
    try {
        const { username, wallet } = req.body;
        if (!username || !wallet) {
            return res.status(400).json({ error: 'Username and wallet required' });
        }

        const user = await prisma.user.create({
            data: { username, wallet },
        });

        res.status(201).json(user);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 3. Create Post (Generates Cryptographic Hash & Emits Kafka Event)
app.post('/api/posts', async (req: Request, res: Response) => {
    try {
        const { content, mediaCid, creatorId } = req.body;

        if (!content || !creatorId) {
            return res.status(400).json({ error: 'Content and creator ID are required' });
        }

        // SHA-256 Hash for blockchain authenticity checking
        const rawPayload = `${content}:${mediaCid || ''}:${Date.now()}`;
        const contentHash = crypto.createHash('sha256').update(rawPayload).digest('hex');

        const post = await prisma.post.create({
            data: {
                content,
                mediaCid,
                contentHash,
                creatorId,
            },
            include: { creator: true },
        });

        // Asynchronously emit event to Kafka
        await publishEvent('post-events', {
            type: 'POST_CREATED',
            postId: post.id,
            creatorId: post.creatorId,
            contentHash: post.contentHash,
        });

        res.status(201).json({
            message: 'Post created successfully',
            post,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Like Post Endpoint (Emits Kafka Event)
app.post('/api/posts/:id/like', async (req: Request, res: Response) => {
    try {
        const postId = req.params.id as string;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const like = await prisma.like.create({
            data: { postId, userId },
        });

        // Asynchronously emit event to Kafka
        await publishEvent('social-events', {
            type: 'LIKE_CREATED',
            postId,
            userId,
        });

        res.status(201).json({ message: 'Post liked', like });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 5. Get All Posts (Direct Database Query)
app.get('/api/posts', async (req: Request, res: Response) => {
    try {
        const posts = await prisma.post.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                creator: {
                    select: { id: true, username: true, wallet: true },
                },
                _count: {
                    select: { likes: true, comments: true },
                },
            },
        });

        res.json(posts);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Fast Feed Endpoint (Redis Cache Powered)
app.get('/api/feed', async (req: Request, res: Response) => {
    try {
        // Fetch top 20 post IDs cached in Redis
        const cachedPostIds = await redisClient.lRange('feed:global', 0, 19);

        if (cachedPostIds.length === 0) {
            // Fallback to PostgreSQL if cache is empty
            const dbPosts = await prisma.post.findMany({
                take: 20,
                orderBy: { createdAt: 'desc' },
                include: { creator: true },
            });
            return res.json({ source: 'database', posts: dbPosts });
        }

        // Batch query details for cached post IDs from Postgres
        const posts = await prisma.post.findMany({
            where: { id: { in: cachedPostIds } },
            include: {
                creator: { select: { id: true, username: true, wallet: true } },
            },
        });

        // Fetch real-time like counts from Redis Hash map
        const likesMap = await redisClient.hGetAll('post:likes');

        const hydratedFeed = posts.map((post) => ({
            ...post,
            likeCount: parseInt(likesMap[post.id] || '0', 10),
        }));

        res.json({ source: 'redis-cache', posts: hydratedFeed });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server and External Services
app.listen(PORT, async () => {
    console.log(`🚀 ChainSphere Backend Server running on port ${PORT}`);
    await connectRedis();
    await connectKafkaProducer();
    await startKafkaConsumers();
});