import { describe, it, expect } from 'vitest';
import { validate, validateId } from '../../server/middleware/validation';

describe('validation middleware', () => {
  describe('validate', () => {
    it('passes validation with valid data', () => {
      const middleware = validate([
        { field: 'topic', required: true, type: 'string', minLength: 1, maxLength: 100 },
      ]);

      let nextCalled = false;
      const req = { body: { topic: 'Valid topic' } } as any;
      const res = { status: () => ({ json: () => {} }) } as any;

      middleware(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });

    it('fails when required field is missing', () => {
      const middleware = validate([
        { field: 'topic', required: true },
      ]);

      let jsonResponse: any;
      const req = { body: {} } as any;
      const res = {
        status: (code: number) => {
          expect(code).toBe(400);
          return {
            json: (data: any) => {
              jsonResponse = data;
            },
          };
        },
      } as any;

      middleware(req, res, () => {});

      expect(jsonResponse).toBeDefined();
      expect(jsonResponse.error).toBe('Validation Error');
      expect(jsonResponse.messages).toContain('topic is required');
    });

    it('fails when string exceeds maxLength', () => {
      const middleware = validate([
        { field: 'topic', required: true, type: 'string', maxLength: 10 },
      ]);

      let jsonResponse: any;
      const req = { body: { topic: 'This is way too long' } } as any;
      const res = {
        status: (code: number) => {
          return {
            json: (data: any) => {
              jsonResponse = data;
            },
          };
        },
      } as any;

      middleware(req, res, () => {});

      expect(jsonResponse.messages).toContain('topic must be at most 10 characters');
    });

    it('fails when type is incorrect', () => {
      const middleware = validate([
        { field: 'count', required: true, type: 'number' },
      ]);

      let jsonResponse: any;
      const req = { body: { count: 'not a number' } } as any;
      const res = {
        status: () => ({
          json: (data: any) => {
            jsonResponse = data;
          },
        }),
      } as any;

      middleware(req, res, () => {});

      expect(jsonResponse.messages).toContain('count must be a number');
    });

    it('validates enum values', () => {
      const middleware = validate([
        { field: 'mode', required: true, enum: ['balanced', 'adversarial'] },
      ]);

      let jsonResponse: any;
      const req = { body: { mode: 'invalid' } } as any;
      const res = {
        status: () => ({
          json: (data: any) => {
            jsonResponse = data;
          },
        }),
      } as any;

      middleware(req, res, () => {});

      expect(jsonResponse.messages[0]).toContain('must be one of');
    });
  });

  describe('validateId', () => {
    it('passes with valid ID', () => {
      let nextCalled = false;
      const req = { params: { id: 'abc123' } } as any;
      const res = {} as any;

      validateId(req, res, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });

    it('fails with too short ID', () => {
      let jsonResponse: any;
      const req = { params: { id: 'ab' } } as any;
      const res = {
        status: (code: number) => {
          expect(code).toBe(400);
          return {
            json: (data: any) => {
              jsonResponse = data;
            },
          };
        },
      } as any;

      validateId(req, res, () => {});

      expect(jsonResponse.error).toBe('Validation Error');
      expect(jsonResponse.message).toContain('Invalid debate ID');
    });

    it('fails with missing ID', () => {
      let jsonResponse: any;
      const req = { params: {} } as any;
      const res = {
        status: (code: number) => {
          return {
            json: (data: any) => {
              jsonResponse = data;
            },
          };
        },
      } as any;

      validateId(req, res, () => {});

      expect(jsonResponse.message).toContain('Invalid debate ID');
    });
  });
});
