import { describe, expect, it } from 'vitest';
import {
  generateSlug,
  getAdminTokenVersion,
  hashPassword,
  sanitizeCustomSlug,
  signAdminSessionToken,
  signUnlockToken,
  timingSafeEqual,
  verifyAdminSessionToken,
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

  it('compares unequal-length secrets safely and signs admin session cookies', async () => {
    expect(await timingSafeEqual('secret-a', 'secret-a')).toBe(true);
    expect(await timingSafeEqual('secret-a', 'secret-longer')).toBe(false);
    expect(await timingSafeEqual('secret-a', 'secret-b')).toBe(false);

    const secret = 'super-secret-signing-key-32-chars';
    const ver1 = await getAdminTokenVersion('hash-v1');
    const ver2 = await getAdminTokenVersion('hash-v2');
    const token = await signAdminSessionToken('my-slug', secret, ver1, 60);
    expect(await verifyAdminSessionToken(token, 'my-slug', secret, ver1)).toBe(true);
    expect(await verifyAdminSessionToken(token, 'my-slug', secret, ver2)).toBe(false);
    expect(await verifyAdminSessionToken(token, 'other-slug', secret, ver1)).toBe(false);
  });
});
