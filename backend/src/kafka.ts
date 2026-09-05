import { Kafka, Producer, Partitioners } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

const kafka = new Kafka({
    clientId: 'chainsphere-backend',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9094'],
});

const producer: Producer = kafka.producer({
    createPartitioner: Partitioners.DefaultPartitioner,
});

export const initKafkaTopics = async () => {
    const admin = kafka.admin();
    try {
        await admin.connect();
        await admin.createTopics({
            topics: [
                { topic: 'post-events', numPartitions: 1, replicationFactor: 1 },
                { topic: 'social-events', numPartitions: 1, replicationFactor: 1 },
            ],
            waitForLeaders: true,
        });
    } catch (err) {
        // Topics already exist
    } finally {
        await admin.disconnect();
    }
};

export const connectKafkaProducer = async () => {
    await initKafkaTopics();
    await producer.connect();
    console.log('✅ Kafka Producer connected successfully');
};

export const publishEvent = async (topic: string, eventData: object) => {
    try {
        await producer.send({
            topic,
            messages: [
                {
                    value: JSON.stringify({
                        ...eventData,
                        timestamp: new Date().toISOString(),
                    }),
                },
            ],
        });
        console.log(`📤 Event emitted to [${topic}]:`, eventData);
    } catch (error) {
        console.error(`❌ Error emitting event to [${topic}]:`, error);
    }
};

export { kafka };