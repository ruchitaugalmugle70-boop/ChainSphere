import { kafka } from './kafka';

export const startKafkaConsumers = async () => {
    const consumer = kafka.consumer({ groupId: 'chainsphere-workers' });

    await consumer.connect();
    console.log('✅ Kafka Consumer connected');

    // Subscribe to platform social topics
    await consumer.subscribe({ topics: ['post-events', 'social-events'], fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (!message.value) return;

            const event = JSON.parse(message.value.toString());
            console.log(`📥 [Worker Service] Received event on topic '${topic}':`, event);

            // Handle specific events
            switch (event.type) {
                case 'POST_CREATED':
                    // Feed Service: Cache post in Redis / update timelines
                    console.log(`⚙️ [Feed Service] Processing post ${event.postId} for feed distribution`);
                    break;

                case 'LIKE_CREATED':
                    // Notification Service: Alert post creator
                    console.log(`⚙️ [Notification Service] User ${event.userId} liked post ${event.postId}`);
                    break;

                default:
                    console.log(`⚙️ [Analytics Service] Logged untracked event: ${event.type}`);
            }
        },
    });
};