const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

export function rateLimit(ip: string, maxRequests: number = 10, windowMs: number = 15 * 60 * 1000): { success: boolean, remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // If no record or window expired, create a new one
  if (!record || record.resetTime < now) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: maxRequests - 1 };
  }

  // If within window
  if (record.count < maxRequests) {
    record.count += 1;
    rateLimitMap.set(ip, record);
    return { success: true, remaining: maxRequests - record.count };
  }

  // Rate limit exceeded
  return { success: false, remaining: 0 };
}
