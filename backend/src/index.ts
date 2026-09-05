import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import uploadRouter from './upload';
import { connectKafkaProducer, publishEvent } from './kafka';
import { startKafkaConsumers } from './Consumers';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/upload', uploadRouter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'OK', service: 'ChainSphere API' });
});

// Create User Endpoint
app.post('/api/users', async (req: Request, res: Response) => {
    try {
        const { username, wallet } = req.body;
        const user = await prisma.user.create({ data: { username, wallet } });
        res.status(201).json(user);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Create Post Endpoint (Emits POST_CREATED event)
app.post('/api/posts', async (req: Request, res: Response) => {
    try {
        const { content, mediaCid, creatorId } = req.body;

        const rawPayload = `${content}:${mediaCid || ''}:${Date.now()}`;
        const contentHash = crypto.createHash('sha256').update(rawPayload).digest('hex');

        const post = await prisma.post.create({
            data: { content, mediaCid, contentHash, creatorId },
            include: { creator: true }
        });

        // Publish event to Kafka
        await publishEvent('post-events', {
            type: 'POST_CREATED',
            postId: post.id,
            creatorId: post.creatorId,
            contentHash: post.contentHash,
        });

        res.status(201).json({ message: 'Post created', post });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Like Post Endpoint (Emits LIKE_CREATED event)
app.post('/api/posts/:id/like', async (req: Request, res: Response) => {
    try {
        const postId = req.params.id as string;
        const { userId } = req.body;

        const like = await prisma.like.create({
            data: { postId, userId },
        });

        // Publish event to Kafka
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

// Start Server & Connections
app.listen(PORT, async () => {
    console.log(`🚀 ChainSphere Backend Server running on port ${PORT}`);
    await connectKafkaProducer();
    await startKafkaConsumers();
});