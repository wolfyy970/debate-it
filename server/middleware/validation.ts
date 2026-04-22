import type { Request, Response, NextFunction } from 'express';
import { sendApiError } from '../lib/http-errors.js';

interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: any[];
}

export function validate(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = req.body[rule.field];

      // Check required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      // Skip further validation if not required and not present
      if (!rule.required && (value === undefined || value === null)) {
        continue;
      }

      // Check type
      if (rule.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          errors.push(`${rule.field} must be a ${rule.type}`);
        }
      }

      // Check string length
      if (rule.type === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${rule.field} must be at most ${rule.maxLength} characters`);
        }
      }

      // Check number range
      if (rule.type === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${rule.field} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${rule.field} must be at most ${rule.max}`);
        }
      }

      // Check enum
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${rule.field} must be one of: ${rule.enum.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      return sendApiError(res, 400, 'Validation Error', errors.join('; '));
    }

    next();
  };
}

/** Express 5 may type `req.params.id` as `string | string[]`. */
export function getRouteParamId(req: Request): string | undefined {
  const raw = req.params.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  return typeof id === 'string' ? id : undefined;
}

export function validateId(req: Request, res: Response, next: NextFunction) {
  const id = getRouteParamId(req);

  if (!id || id.length < 4) {
    return sendApiError(res, 400, 'Validation Error', 'Invalid debate ID');
  }

  next();
}