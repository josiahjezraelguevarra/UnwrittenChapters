import { describe, expect, it } from 'vitest';
import {
  generateSlug,
  hashPassword,
  sanitizeCustomSlug,
  signUnlockToken,
  verifyPassword,
  verifyUnlockToken
} from '../src/server/crypto';

describe('crypto utilities', () => {
  it('hashes and verifies passwords via PBKDF2', async () => {
    const hashed = await hashPassword('secret-gallery-pass');
    expect(await verifyPassword('secret-gallery-pass', hashed)).toBe(true);
    expect(await verifyPassword('wrong-pass', hashed)).toBe(false);
  });

  it('signs and verifies gallery-scoped HMAC unlock tokens', async () => {
    const secret = 'super-secret-signing-key-32-chars';
    const token = await signUnlockToken('wedding-2026', secret, 60);
    expect(await verifyUnlockToken(token, 'wedding-2026', secret)).toBe(true);
    expect(await verifyUnlockToken(token, 'other-gallery', secret)).toBe(false);
    expect(await verifyUnlockToken(`${token}tamper`, 'wedding-2026', secret)).toBe(false);
  });

  it('validates custom slugs and blocks reserved paths', () => {
    expect(sanitizeCustomSlug('Clara & Alex 2026!')).toBe('clara-alex-2026');
    expect(sanitizeCustomSlug('api')).toBeNull();
    expect(sanitizeCustomSlug('admin')).toBeNull();
    expect(sanitizeCustomSlug('ab')).toBeNull();
    expect(generateSlug(8)).toHaveLength(8);
  });
});
