import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter (Token Bucket-ish)
// Note: In a serverless/edge environment, this state is not shared between instances.
// For production robust rate limiting, use Redis (e.g., Upstash).
const rateLimitMap = new Map();

// Configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per minute per IP
const BLOCKED_IPS = new Set<string>(); // Add known bad IPs here

// WAF: Block common malicious patterns
const MALICIOUS_PATTERNS = [
  /\.env$/,
  /\.git/,
  /\.aws/,
  /wp-admin/,
  /wp-login/,
  /composer\.lock/,
  /yarn\.lock/,
  /package\.json/,
  /eval\(/,
  /union select/,
  /<script>/,
  /alert\(/,
];

// WAF: Block suspicious User Agents
const SUSPICIOUS_USER_AGENTS = [
  'sqlmap',
  'nikto',
  'curb',
  'gobuster',
  'python-requests', // Often used by bots, be careful if you use python scripts extensively
  'nmap',
  'burp', // Burp Suite and similar
  'nessus',
  'nuclei',
  'acunetix',
  'netsparker',
];

function extractClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

export function proxy(request: NextRequest) {
  const ip = extractClientIp(request);
  const path = request.nextUrl.pathname;
  const userAgent = request.headers.get('user-agent') || '';

  // 1. IP Check
  if (BLOCKED_IPS.has(ip)) {
     return new NextResponse(JSON.stringify({ error: 'Access Denied: Your IP is blocked.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  // 2. WAF - User Agent Scan
  const isSuspiciousAgent = SUSPICIOUS_USER_AGENTS.some((agent) => 
    userAgent.toLowerCase().includes(agent.toLowerCase())
  );
  if (isSuspiciousAgent) {
    console.warn(`[WAF] Blocked suspicious User-Agent (${userAgent}) from IP: ${ip}`);
    return new NextResponse(JSON.stringify({ error: 'Access Denied: 403 Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  // 3. WAF - Path & Query Scan
  const isMaliciousPath = MALICIOUS_PATTERNS.some((pattern) => pattern.test(path));
  const queryParams = request.nextUrl.search;
  const isMaliciousQuery = MALICIOUS_PATTERNS.some((pattern) => pattern.test(decodeURIComponent(queryParams)));

  if (isMaliciousPath || isMaliciousQuery) {
    console.warn(`[WAF] Blocked malicious request to ${path} from IP: ${ip}`);
    return new NextResponse(JSON.stringify({ error: 'Access Denied: Malicious Request Detected' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  // Security: Strict Mode for Admin Routes
  // Prevent automated tools from bruteforcing /admin even if they bypass other checks
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
      // Here we could add stricter checks, e.g., requiring a specific header or cookie that only the login page sets.
      // For now, we rely on the client-side Firebase Auth + Server-side API token verification.
  }

  // 4. Rate Limiting (Simple In-Memory)
  // Clean up old entries periodically (simple implementation)
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  const requestHistory = rateLimitMap.get(ip) || [];
  const validRequests = requestHistory.filter((timestamp: number) => timestamp > windowStart);
  
  // Stricter Rate Limit for Admin Login
  const limit = path.includes('/admin/login') ? 5 : MAX_REQUESTS_PER_WINDOW; 
  
  if (validRequests.length >= limit) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - validRequests[0])) / 1000) }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
    );
  }

  validRequests.push(now);
  rateLimitMap.set(ip, validRequests);

  // 5. Security Headers for all responses
  const response = NextResponse.next();
  
  // CSP: Allow typical sources but restrict strict inline scripts where possible
  // Note: 'unsafe-inline' is often needed for Styled Components or some Next.js features if not using nonces.
  // We'll trust self and firebase domains.
  const cspHeader = `
    default-src 'self';
    connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com https://*.googleapis.com;
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com https://*.googleapis.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.blob.core.windows.net;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `;

  response.headers.set('Content-Security-Policy', cspHeader.replace(/\s{2,}/g, ' ').trim());
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
