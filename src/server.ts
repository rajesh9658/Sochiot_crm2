import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { prisma } from './lib/prisma.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await prisma.$disconnect();
  process.exit(0);
});








// import express from "express";
// import cors from "cors";
// import helmet from "helmet";
// import morgan from "morgan";
// import compression from "compression";
// import dotenv from "dotenv";

// dotenv.config();

// const app = express();

// app.use(express.json());
// app.use(cors());
// app.use(helmet());
// app.use(morgan("dev"));
// app.use(compression());

// app.get("/", (req, res) => {
//   res.send("🚀 Sochiot CRM API Running...");
// });

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });