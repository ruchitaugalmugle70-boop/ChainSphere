# ChainSphere 🌐⛓️

A decentralized, event-driven Web3 social media platform featuring on-chain content authenticity verification, native tipping, and real-time event streaming.

## 🏗️ Architecture Overview

- **Smart Contracts (`contracts-backend`)**: Hardhat v3, Solidity 0.8.20, Viem, and Hardhat Ignition for proof of authenticity and direct creator tipping.
- **Backend Service (`backend`)**: Express.js, TypeScript, Prisma ORM, and PostgreSQL.
- **Event Streaming**: Apache Kafka (KRaft mode) for decoupled event processing (e.g. feed generation, notifications).
- **Decentralized Storage**: IPFS via Pinata SDK for media assets.
- **Caching**: Redis for ultra-low latency timeline and feed delivery.

## 🚀 Getting Started

### 1. Start Infrastructure Services
```bash
docker compose up -d
```

### 2. Smart Contracts (Local Blockchain)
```bash
cd contracts-backend
npx hardhat node

# In a separate terminal:
npx hardhat ignition deploy ignition/modules/ChainSphere.ts --network localhost
```

### 3. Backend API
```bash
cd backend
npm install
npx prisma db push
npm run dev
```
