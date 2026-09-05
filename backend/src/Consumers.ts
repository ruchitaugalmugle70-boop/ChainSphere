import { kafka } from './kafka';
import { cachePostInFeed, incrementLikeCounter } from './redis';

export const startKafkaConsumers = async () => {
    const consumer = kafka.consumer({ groupId: 'chainsphere-workers' });

    await consumer.connect();
    console.log('✅ Kafka Consumer connected');

    await consumer.subscribe({ topics: ['post-events', 'social-events'], fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            if (!message.value) return;

            const event = JSON.parse(message.value.toString());

            switch (event.type) {
                case 'POST_CREATED':
                    // Async feed generation using Redis
                    await cachePostInFeed(event.postId);
                    console.log(`🚀 [Redis Worker] Post ${event.postId} added to global feed cache`);
                    break;

                case 'LIKE_CREATED':
                    // Increment high-speed memory counter
                    await incrementLikeCounter(event.postId);
                    console.log(`🚀 [Redis Worker] Incremented Redis like count for post ${event.postId}`);
                    break;

                default:
                    break;
            }
        },
    });
};