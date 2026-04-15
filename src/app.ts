import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import planRoutes from './routes/plan.routes';
import customerRoutes from './routes/customer.routes';
import productInterestRoutes from './routes/product-interest.routes';
import activityRoutes from './routes/activity.routes';
import followupRoutes from './routes/followup.routes';
import userRoutes from './routes/user.routes';
import roleRoutes from './routes/role.routes';
import dealRoutes from './routes/deal.routes';
import paymentRoutes from './routes/payment.routes';

const app = express();

// Ensure BigInt values from Prisma can be serialized in JSON responses.
app.set('json replacer', (_key: string, value: unknown) =>
  typeof value === 'bigint' ? value.toString() : value
);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('dev'));

// Compression
app.use(compression());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/customers', customerRoutes);                    
app.use('/api/product-interests', productInterestRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling (must be last)
app.use(errorHandler);

export default app;
