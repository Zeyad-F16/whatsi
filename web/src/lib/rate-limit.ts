// In-memory rate limiting mechanism

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitRecord>();

export function rateLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now();
  const record = rateLimits.get(identifier);

  // If no record exists or the window has expired, create a new record
  if (!record || now > record.resetTime) {
    rateLimits.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { success: true, count: 1 };
  }

  // If the limit has been reached
  if (record.count >= limit) {
    return { success: false, count: record.count };
  }

  // Otherwise, increment the count
  record.count += 1;
  rateLimits.set(identifier, record);
  return { success: true, count: record.count };
}

// Clean up expired records every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimits.entries()) {
    if (now > record.resetTime) {
      rateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000);
