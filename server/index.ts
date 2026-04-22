import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import debatesRouter from './routes/debates';
import { checkApiKeys } from './lib/openrouter';

const app = express();
const PORT = process.env.PORT || 3001;

// Environment validation
function validateEnvironment(): void {
  const keys = checkApiKeys();

  if (!keys.hasAny) {
    console.warn('⚠️  WARNING: No API keys configured (OPENROUTER_API_KEY or KIMI_API_KEY)');
    console.warn('   Debates cannot be started without an API key. Set an API key to enable LLM responses.');
  } else {
    if (keys.openrouter) {
      console.log('✅ OpenRouter API key configured');
    }
    if (keys.kimi) {
      console.log('✅ Kimi API key configured');
    }
  }
}

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.connection.remoteAddress;

  console.log(`[${timestamp}] ${method} ${path} - ${ip}`);

  // Log response time
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${timestamp}] ${method} ${path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
});

// CORS
app.use(cors());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  const keys = checkApiKeys();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
    configured: {
      openrouter: keys.openrouter,
      kimi: keys.kimi,
    },
    hasAnyKey: keys.hasAny,
  });
});

// API routes
app.use('/api/debates', debatesRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🎯 Debater API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
  validateEnvironment();
});

// Graceful shutdown
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default app;