import { describe, it, expect } from 'vitest';
import { joinApiPath } from '../lib/apiBase';

describe('joinApiPath', () => {
  it('returns path when base is empty', () => {
    expect(joinApiPath('', '/api/debates')).toBe('/api/debates');
  });

  it('strips trailing slash on base', () => {
    expect(joinApiPath('http://localhost:3001/', '/api/debates')).toBe('http://localhost:3001/api/debates');
  });

  it('adds leading slash to path when missing', () => {
    expect(joinApiPath('http://localhost:3001', 'api/x')).toBe('http://localhost:3001/api/x');
  });
});
