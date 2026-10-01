import express, { Application, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { globalLimiter } from './common/middleware/rate-limiter';
import { errorMiddleware } from './common/middleware/error.middleware';
import { logger } from './config/logger';
import rootRouter from './routes';

const app: Application = express();

// Secure headers
app.use(helmet());

// Cross Origin Resource Sharing
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://127.0.0.1:5500,http://localhost:5500').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

// Request Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP Request Logger
const morganStream = {
  write: (message: string) => logger.http(message.trim()),
};

app.use(
  morgan(
    ':method :url :status :res[content-length] - :response-time ms',
    {
      stream: morganStream,
    }
  )
);

// Apply rate limiter globally
app.use('/api', globalLimiter);

// Health Check API
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'UP',
    },
  });
});

// Serve ONLY genuinely public upload folders directly (course cover images, avatars).
// Materials, qualifications, assessments and submissions must NEVER be statically served here -
// they are gated behind /api/v1/storage/download/:materialId (see checkMaterialAccess middleware).
app.use(
  '/uploads/courses',
  express.static(path.resolve(process.cwd(), 'uploads', 'courses'))
);
app.use(
  '/uploads/avatars',
  express.static(path.resolve(process.cwd(), 'uploads', 'avatars'))
);

// Centralized Routing hooks
app.use('/api/v1', rootRouter);

// Catch 404 and forward to error handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Resource not found: ${_req.method} ${_req.originalUrl}`,
  });
});

// Centralized Error Interceptor Middleware
app.use(errorMiddleware);

export default app;