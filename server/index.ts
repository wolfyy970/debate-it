import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import debatesRouter from './routes/debates';
import { checkApiKeys } from './lib/openrouter';
import { sendApiError } from './lib/http-errors.js';
import { getDebateStore } from './lib/store';
import { DEFAULT_API_PORT, JSON_BODY_LIMIT } from './lib/constants';

const app = express();
const PORT = process.env.PORT || DEFAULT_API_PORT;

// Environment validation
function validateEnvironment(): void {
  const keys = checkApiKeys();

  if (!keys.hasAny) {
    console.warn('⚠️  WARNING: No LLM API key configured (OPENROUTER_API_KEY or KIMI_API_KEY).');
  } else {
    if (keys.openrouter) console.log('✅ OpenRouter API key configured');
    if (keys.kimi) console.log('✅ Kimi API key configured');
  }

  if (!keys.tavily) {
    console.warn('⚠️  WARNING: TAVILY_API_KEY not configured. Debater requires Tavily for agent search.');
  } else {
    console.log('✅ Tavily API key configured');
  }

  if (!keys.hasAllRequired) {
    console.warn('   Debates cannot be started until all required keys are set.');
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
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));

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
      tavily: keys.tavily,
    },
    hasAnyKey: keys.hasAny,
    hasAllRequired: keys.hasAllRequired,
    persistence: {
      loadError: getDebateStore().getLastLoadError(),
    },
  });
});

// API routes
app.use('/api/debates', debatesRouter);

// 404 handler
app.use((req, res) => {
  sendApiError(res, 404, 'Not Found', `Cannot ${req.method} ${req.path}`);
});

// Global error handler
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  void _next;
  console.error('Unhandled error:', err);
  const status =
    err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 500;
  const message =
    err instanceof Error ? err.message : typeof err === 'string' ? err : 'Something went wrong';
  sendApiError(
    res,
    status,
    'Internal Server Error',
    process.env.NODE_ENV === 'development' ? message : 'Something went wrong',
  );
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