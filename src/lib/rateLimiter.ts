/**
 * Client-side rate limiter to prevent brute force attacks on authentication.
 * This is a first line of defense - server-side rate limiting should also be implemented.
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil: number | null;
}

const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,          // Maximum attempts before blocking
  windowMs: 15 * 60 * 1000, // 15 minute window
  blockDurationMs: 30 * 60 * 1000, // 30 minute block after exceeding attempts
};

const STORAGE_KEY = 'auth_rate_limit';

function getEntry(): RateLimitEntry {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return {
    attempts: 0,
    firstAttempt: Date.now(),
    blockedUntil: null,
  };
}

function saveEntry(entry: RateLimitEntry): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
}

export function checkRateLimit(): { allowed: boolean; remainingAttempts: number; blockedUntil: Date | null; message: string } {
  const now = Date.now();
  const entry = getEntry();

  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const remainingMinutes = Math.ceil((entry.blockedUntil - now) / 60000);
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: new Date(entry.blockedUntil),
      message: `Too many login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
    };
  }

  // Reset if block has expired or window has passed
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    const newEntry: RateLimitEntry = {
      attempts: 0,
      firstAttempt: now,
      blockedUntil: null,
    };
    saveEntry(newEntry);
    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts,
      blockedUntil: null,
      message: '',
    };
  }

  // Check if window has expired and reset
  if (now - entry.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
    const newEntry: RateLimitEntry = {
      attempts: 0,
      firstAttempt: now,
      blockedUntil: null,
    };
    saveEntry(newEntry);
    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts,
      blockedUntil: null,
      message: '',
    };
  }

  // Check if max attempts reached
  if (entry.attempts >= RATE_LIMIT_CONFIG.maxAttempts) {
    const blockedUntil = now + RATE_LIMIT_CONFIG.blockDurationMs;
    const newEntry: RateLimitEntry = {
      ...entry,
      blockedUntil,
    };
    saveEntry(newEntry);
    const remainingMinutes = Math.ceil(RATE_LIMIT_CONFIG.blockDurationMs / 60000);
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: new Date(blockedUntil),
      message: `Too many login attempts. Please try again in ${remainingMinutes} minutes.`,
    };
  }

  return {
    allowed: true,
    remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts - entry.attempts,
    blockedUntil: null,
    message: '',
  };
}

export function recordAttempt(): void {
  const now = Date.now();
  const entry = getEntry();

  // Reset if window has passed
  if (now - entry.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
    saveEntry({
      attempts: 1,
      firstAttempt: now,
      blockedUntil: null,
    });
    return;
  }

  saveEntry({
    ...entry,
    attempts: entry.attempts + 1,
  });
}

export function resetRateLimit(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
