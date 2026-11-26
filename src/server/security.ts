import type { Context } from 'hono';

const SLUG_REGEX = /^[a-z0-9-]{3,48}$/;
const DRIVE_ID_REGEX = /^[a-zA-Z0-9_-]{8,80}$/;
const VISITOR_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;
const RANGE_HEADER_REGEX = /^bytes=(\d+-\d*|-\d+)$/;
const TRUSTED_GOOGLE_HOST_SUFFIXES = [
  '.googleusercontent.com',
  '.google.com',
  '.gstatic.com'
];

export function isValidSlugParam(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

export function isValidDriveId(id: string): boolean {
  return DRIVE_ID_REGEX.test(id);
}

export function isValidVisitorId(id: string): boolean {
  return VISITOR_ID_REGEX.test(id);
}

export function isValidRangeHeader(range: string): boolean {
  return range.length <= 64 && RANGE_HEADER_REGEX.test(range.trim());
}

export function isTrustedGoogleImageUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return TRUSTED_GOOGLE_HOST_SUFFIXES.some(
      (suffix) => host === suffix.slice(1) || host.endsWith(suffix)
    );
  } catch {
    return false;
  }
}

export function sanitizeControlChars(raw: string, maxLen = 200): string {
  // Strip ASCII control characters and Unicode bidirectional override characters
  return raw
    .replace(/[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, '')
    .trim()
    .slice(0, maxLen);
}

const textEncoder = new TextEncoder();

export async function readBoundedJsonObject(
  c: Context,
  allowedKeys: ReadonlySet<string>,
  maxBytes = 32_768
): Promise<
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; response: Response }
> {
  const contentLengthHeader = c.req.header('content-length');
  if (contentLengthHeader) {
    const declared = Number(contentLengthHeader);
    if (Number.isFinite(declared) && declared > maxBytes) {
      return {
        ok: false,
        response: c.json(
          { error: 'Request payload is too large.', code: 'PAYLOAD_TOO_LARGE' },
          413
        )
      };
    }
  }

  let rawText = '';
  try {
    rawText = await c.req.text();
  } catch {
    return {
      ok: false,
      response: c.json({ error: 'Invalid request body.', code: 'INVALID_INPUT' }, 400)
    };
  }

  if (textEncoder.encode(rawText).byteLength > maxBytes) {
    return {
      ok: false,
      response: c.json(
        { error: 'Request payload is too large.', code: 'PAYLOAD_TOO_LARGE' },
        413
      )
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      response: c.json({ error: 'Invalid JSON body.', code: 'INVALID_INPUT' }, 400)
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      response: c.json({ error: 'Expected a JSON object.', code: 'INVALID_INPUT' }, 400)
    };
  }

  const record = parsed as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return {
        ok: false,
        response: c.json({ error: 'Forbidden payload field.', code: 'INVALID_INPUT' }, 400)
      };
    }
    if (!allowedKeys.has(key)) {
      return {
        ok: false,
        response: c.json(
          { error: `Unexpected field: ${key}`, code: 'UNEXPECTED_FIELD' },
          400
        )
      };
    }
  }

  return { ok: true, data: record };
}
