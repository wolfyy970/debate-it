import type { Response } from 'express';

/**
 * Consistent JSON error body across API routes and middleware.
 * Shape: `{ error, message, timestamp, ...extras }`
 */
export function sendApiError(
  res: Response,
  status: number,
  error: string,
  message: string,
  extras?: Record<string, unknown>
): void {
  res.status(status).json({
    error,
    message,
    timestamp: new Date().toISOString(),
    ...extras,
  });
}
