/**
 * ============================================================
 * EE AEGIS V2.0 — Cloudflare Worker API Proxy
 *
 * A free, zero-cost relay for routing Western AI API calls
 * through Cloudflare's global network from Russia.
 *
 * Features:
 * - Routes to Claude, OpenAI, Google AI, xAI, DeepSeek APIs
 * - Streaming SSE support (for long-polling responses)
 * - Simple authentication via X-Proxy-Key header
 * - Automatic request logging
 * - CORS handling
 *
 * Deployment:
 * 1. Create a Cloudflare Worker
 * 2. Set environment variables (see below)
 * 3. Deploy this code
 * 4. Set DNS to point to the Worker URL
 *
 * Usage:
 * curl -X POST https://aegis-proxy.example.workers.dev/api/anthropic/messages \
 *   -H "X-Proxy-Key: your-secret-key" \
 *   -H "X-Anthropic-Api-Key: sk-ant-..." \
 *   -H "Content-Type: application/json" \
 *   -d '{"model": "claude-3-5-sonnet-20241022", "max_tokens": 1024, ...}'
 * ============================================================
 */

// ============================================================
// Configuration
// ============================================================

// Environment variables (set in Cloudflare Worker settings):
// PROXY_AUTH_KEY: Secret key for authentication (required)
// ALLOWED_ORIGINS: Comma-separated origins (e.g., "https://example.com,http://localhost:3000")
// LOG_REQUESTS: "true" or "false" (default: true)
// RATE_LIMIT_REQUESTS: Max requests per minute per IP (default: 60)

const CONFIG = {
    PROXY_AUTH_KEY: env?.PROXY_AUTH_KEY || 'change-me-immediately',
    ALLOWED_ORIGINS: (env?.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()),
    LOG_REQUESTS: env?.LOG_REQUESTS !== 'false',
    RATE_LIMIT_REQUESTS: parseInt(env?.RATE_LIMIT_REQUESTS || '60'),
};

// Supported AI API endpoints
const API_ENDPOINTS = {
    // Anthropic Claude API
    'anthropic': {
        baseUrl: 'https://api.anthropic.com/v1',
        requiredHeaders: ['x-anthropic-api-key'],
        methods: ['POST'],
    },

    // OpenAI API
    'openai': {
        baseUrl: 'https://api.openai.com/v1',
        requiredHeaders: ['authorization'],
        methods: ['POST'],
    },

    // Google Generative AI
    'google': {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        requiredHeaders: ['x-goog-api-key'],
        methods: ['POST'],
    },

    // xAI Grok API
    'xai': {
        baseUrl: 'https://api.x.ai/v1',
        requiredHeaders: ['authorization'],
        methods: ['POST'],
    },

    // DeepSeek API
    'deepseek': {
        baseUrl: 'https://api.deepseek.com/v1',
        requiredHeaders: ['authorization'],
        methods: ['POST'],
    },

    // Groq Cloud API
    'groq': {
        baseUrl: 'https://api.groq.com/openai/v1',
        requiredHeaders: ['authorization'],
        methods: ['POST'],
    },
};

// ============================================================
// Rate Limiting (KV-based, requires Cloudflare KV binding)
// ============================================================

class RateLimiter {
    constructor(kv, limit = 60) {
        this.kv = kv;
        this.limit = limit; // requests per minute
    }

    async checkLimit(key) {
        if (!this.kv) {
            // KV not available, allow all requests
            return { allowed: true, remaining: this.limit };
        }

        const now = Math.floor(Date.now() / 1000);
        const window = now - (now % 60); // 1-minute window
        const kvKey = `rate:${key}:${window}`;

        const current = parseInt(await this.kv.get(kvKey) || '0');

        if (current >= this.limit) {
            return { allowed: false, remaining: 0, retryAfter: 60 - (now % 60) };
        }

        await this.kv.put(kvKey, String(current + 1), { expirationTtl: 120 });

        return { allowed: true, remaining: this.limit - (current + 1) };
    }
}

// ============================================================
// Request Logging
// ============================================================

class RequestLogger {
    static async log(request, response, duration, provider) {
        if (!CONFIG.LOG_REQUESTS) return;

        const log = {
            timestamp: new Date().toISOString(),
            ip: request.headers.get('cf-connecting-ip') || 'unknown',
            method: request.method,
            url: request.url,
            provider: provider,
            status: response.status,
            duration_ms: duration,
            user_agent: request.headers.get('user-agent'),
        };

        // Send to analytics (Cloudflare Logpush, or just log to console)
        console.log(JSON.stringify(log));

        // Optional: Send to external logging service
        // await fetch('https://your-logging-service.com/logs', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(log),
        // }).catch(err => console.error('Logging error:', err));
    }
}

// ============================================================
// Request Handler
// ============================================================

async function handleRequest(request) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const path = url.pathname;

    // ────────────────────────────────────────────────────────
    // Health Check
    // ────────────────────────────────────────────────────────

    if (path === '/' || path === '/health') {
        return new Response(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // ────────────────────────────────────────────────────────
    // CORS Preflight
    // ────────────────────────────────────────────────────────

    if (request.method === 'OPTIONS') {
        return handleCORS(request);
    }

    // ────────────────────────────────────────────────────────
    // Authentication
    // ────────────────────────────────────────────────────────

    const authKey = request.headers.get('x-proxy-key');
    if (!authKey || authKey !== CONFIG.PROXY_AUTH_KEY) {
        return errorResponse(401, 'Unauthorized: Invalid or missing X-Proxy-Key header');
    }

    // ────────────────────────────────────────────────────────
    // Rate Limiting
    // ────────────────────────────────────────────────────────

    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    const rateLimiter = new RateLimiter(RATE_LIMIT_KV, CONFIG.RATE_LIMIT_REQUESTS);
    const rateCheck = await rateLimiter.checkLimit(clientIp);

    if (!rateCheck.allowed) {
        return errorResponse(429, 'Rate limit exceeded', {
            'Retry-After': String(rateCheck.retryAfter),
        });
    }

    // ────────────────────────────────────────────────────────
    // Route Parsing: /api/{provider}/...
    // ────────────────────────────────────────────────────────

    const match = path.match(/^\/api\/([a-z]+)\/(.*)/);
    if (!match) {
        return errorResponse(404, 'Invalid API path. Use /api/{provider}/path');
    }

    const [, provider, apiPath] = match;

    if (!API_ENDPOINTS[provider]) {
        return errorResponse(400, `Unknown provider: ${provider}. Supported: ${Object.keys(API_ENDPOINTS).join(', ')}`);
    }

    // ────────────────────────────────────────────────────────
    // Proxy the request
    // ────────────────────────────────────────────────────────

    try {
        const response = await proxyRequest(request, provider, apiPath);
        const duration = Date.now() - startTime;

        // Log the request
        await RequestLogger.log(request, response, duration, provider);

        // Add rate limit headers
        const headers = new Headers(response.headers);
        headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));
        headers.set('X-Proxy-Duration-Ms', String(duration));

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers,
        });

    } catch (error) {
        console.error('Proxy error:', error);
        return errorResponse(502, 'Failed to proxy request', { 'X-Error': error.message });
    }
}

// ============================================================
// Proxy Implementation
// ============================================================

async function proxyRequest(request, provider, apiPath) {
    const endpoint = API_ENDPOINTS[provider];
    const targetUrl = new URL(`${endpoint.baseUrl}/${apiPath}`);

    // Preserve query parameters
    targetUrl.search = new URL(request.url).search;

    // Build headers for upstream request
    const upstreamHeaders = new Headers();

    // Copy authentication headers from original request
    for (const header of endpoint.requiredHeaders) {
        const value = request.headers.get(header);
        if (value) {
            upstreamHeaders.set(header, value);
        }
    }

    // Copy other important headers
    const headersToForward = [
        'content-type',
        'accept',
        'accept-encoding',
        'user-agent',
        'anthropic-version',
        'anthropic-beta',
    ];

    for (const header of headersToForward) {
        const value = request.headers.get(header);
        if (value) {
            upstreamHeaders.set(header, value);
        }
    }

    // Create upstream request
    const upstreamRequest = new Request(targetUrl, {
        method: request.method,
        headers: upstreamHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    });

    // For streaming responses, we need to handle them carefully
    if (request.headers.get('accept') === 'text/event-stream' ||
        request.headers.get('content-type') === 'application/json' &&
        (request.method === 'POST' || request.method === 'PUT')) {

        // Check if request body indicates streaming
        const bodyText = await request.clone().text();
        const isStream = bodyText.includes('"stream":true') || bodyText.includes("'stream':true");

        if (isStream) {
            return fetchWithStreaming(upstreamRequest);
        }
    }

    // Regular request
    return fetch(upstreamRequest);
}

async function fetchWithStreaming(request) {
    const response = await fetch(request);

    // For streaming responses, pass through as-is
    if (response.status >= 200 && response.status < 300) {
        const headers = new Headers(response.headers);
        headers.set('Transfer-Encoding', 'chunked');
        headers.set('Cache-Control', 'no-cache');

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers,
        });
    }

    return response;
}

// ============================================================
// CORS Handling
// ============================================================

function handleCORS(request) {
    const origin = request.headers.get('origin') || '*';
    const allowedOrigin = CONFIG.ALLOWED_ORIGINS.includes('*') ||
                         CONFIG.ALLOWED_ORIGINS.includes(origin) ? origin : null;

    const corsHeaders = {
        'Access-Control-Allow-Origin': allowedOrigin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Key, X-Anthropic-Api-Key, Authorization, Anthropic-Version, Anthropic-Beta',
        'Access-Control-Max-Age': '86400',
    };

    return new Response(null, {
        status: 204,
        headers: corsHeaders,
    });
}

// ============================================================
// Error Response Helper
// ============================================================

function errorResponse(status, message, extraHeaders = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...extraHeaders,
    };

    const origin = 'unknown'; // We don't have request context here
    headers['Access-Control-Allow-Origin'] = CONFIG.ALLOWED_ORIGINS.includes('*') ? '*' : origin;

    return new Response(JSON.stringify({
        error: {
            message: message,
            status: status,
            timestamp: new Date().toISOString(),
        },
    }), {
        status: status,
        headers: headers,
    });
}

// ============================================================
// Cloudflare Worker Export
// ============================================================

export default {
    async fetch(request, env, ctx) {
        // Make env globally available to config
        globalThis.env = env;

        try {
            return await handleRequest(request);
        } catch (error) {
            console.error('Worker error:', error);
            return errorResponse(500, 'Internal server error');
        }
    },
};

/**
 * ============================================================
 * Cloudflare Worker Deployment Instructions
 * ============================================================
 *
 * 1. Create a Cloudflare Worker:
 *    - Go to dash.cloudflare.com → Workers
 *    - Create a new Worker
 *    - Name it "aegis-proxy"
 *
 * 2. Set Environment Variables:
 *    - In Worker Settings → Environment Variables:
 *      * PROXY_AUTH_KEY = "your-secret-key-change-this"
 *      * ALLOWED_ORIGINS = "https://aegis-v2.yc.example.com,https://localhost:3000"
 *      * LOG_REQUESTS = "true"
 *      * RATE_LIMIT_REQUESTS = "100"
 *
 * 3. Deploy:
 *    - Copy this code into the Worker editor
 *    - Click "Save and Deploy"
 *    - Access at: https://aegis-proxy.<your-account>.workers.dev
 *
 * 4. Configure DNS (optional):
 *    - Create a CNAME record: aegis-proxy.yourdomain.com → <worker-url>
 *    - Or use Workers Routes: yourdomain.com/api/* → Worker
 *
 * 5. From AEGIS VM, use:
 *    export CLOUDFLARE_PROXY_URL="https://aegis-proxy.example.workers.dev"
 *    export CLOUDFLARE_PROXY_KEY="your-secret-key-change-this"
 *
 * 6. Then configure apps to route API calls through:
 *    X-Proxy-Key: $CLOUDFLARE_PROXY_KEY
 *    POST $CLOUDFLARE_PROXY_URL/api/{provider}/...
 */
