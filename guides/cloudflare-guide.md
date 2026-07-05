# Cloudflare Workers & Pages Implementation Guide

## Overview
Cloudflare cung cấp edge computing platform với Workers (serverless functions), Pages (static hosting), KV storage, D1 database, và nhiều services khác.

## 1. Setup Account

### Bước 1: Tạo Account
1. Truy cập [cloudflare.com](https://cloudflare.com)
2. Sign up cho free account
3. Add domain (optional cho testing)
4. Verify email

### Bước 2: Install Wrangler CLI
```bash
npm install -g wrangler
# Hoặc
yarn global add wrangler

# Login
wrangler auth login
```

## 2. Cloudflare Workers

### Create New Worker
```bash
# Create new worker
wrangler init my-worker
cd my-worker

# Directory structure
my-worker/
├── wrangler.toml
├── src/
│   └── index.ts
└── package.json
```

### Basic Worker Example
```typescript
// src/index.ts
export interface Env {
  // Environment variables
  API_KEY: string;
  DATABASE_URL: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route handling
    switch (path) {
      case '/':
        return new Response('Hello from Cloudflare Worker!', {
          headers: { 'Content-Type': 'text/plain' }
        });

      case '/api/hello':
        return handleHello(request, env);

      case '/api/users':
        return handleUsers(request, env);

      default:
        return new Response('Not Found', { status: 404 });
    }
  },
};

// API Handlers
async function handleHello(request: Request, env: Env): Promise<Response> {
  const { name } = await request.json() as { name?: string };
  
  return new Response(JSON.stringify({
    message: `Hello, ${name || 'World'}!`,
    timestamp: new Date().toISOString(),
    ip: request.headers.get('CF-Connecting-IP')
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleUsers(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    // Fetch users from external API
    const response = await fetch('https://jsonplaceholder.typicode.com/users');
    const users = await response.json();
    
    return new Response(JSON.stringify(users), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
```

### Worker Configuration
```toml
# wrangler.toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Environment variables
[vars]
ENVIRONMENT = "development"

# Secrets (use wrangler secret put)
# wrangler secret put API_KEY

# KV Namespace bindings
[[kv_namespaces]]
binding = "MY_KV"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-id"

# D1 Database bindings
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "your-database-id"
```

## 3. Cloudflare Pages

### Deploy Static Site
```bash
# Build your React/Next.js/Vue app
npm run build

# Deploy to Pages
wrangler pages deploy dist --project-name=my-app

# Or connect Git repository for automatic deployments
```

### Pages Functions
```typescript
// functions/api/[slug].ts
export async function onRequest(context) {
  const { request, env, params } = context;
  const slug = params.slug;

  // Handle different HTTP methods
  switch (request.method) {
    case 'GET':
      return new Response(JSON.stringify({ slug }), {
        headers: { 'Content-Type': 'application/json' }
      });

    case 'POST':
      const body = await request.json();
      return new Response(JSON.stringify({ 
        message: 'Created', 
        data: body 
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    default:
      return new Response('Method Not Allowed', { status: 405 });
  }
}
```

### Next.js with Pages
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig
```

## 4. KV Storage

### Basic KV Operations
```typescript
// src/kv-example.ts
export interface Env {
  MY_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'set':
        return await setKV(request, env);
      case 'get':
        return await getKV(request, env);
      case 'delete':
        return await deleteKV(request, env);
      default:
        return new Response('Missing action parameter', { status: 400 });
    }
  },
};

async function setKV(request: Request, env: Env): Promise<Response> {
  const { key, value } = await request.json();
  
  await env.MY_KV.put(key, value, {
    expirationTtl: 3600, // 1 hour
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getKV(request: Request, env: Env): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key');
  
  if (!key) {
    return new Response('Missing key parameter', { status: 400 });
  }

  const value = await env.MY_KV.get(key);
  
  if (value === null) {
    return new Response('Key not found', { status: 404 });
  }

  return new Response(value, {
    headers: { 'Content-Type': 'text/plain' }
  });
}

async function deleteKV(request: Request, env: Env): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key');
  
  if (!key) {
    return new Response('Missing key parameter', { status: 400 });
  }

  await env.MY_KV.delete(key);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Advanced KV Usage
```typescript
// List keys with pagination
async function listKeys(env: Env): Promise<Response> {
  const list = await env.MY_KV.list({
    limit: 100,
    prefix: 'user:',
  });

  return new Response(JSON.stringify(list), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Atomic operations
async function incrementCounter(env: Env, key: string): Promise<number> {
  const current = await env.MY_KV.get(key);
  const newValue = (parseInt(current || '0') + 1).toString();
  
  await env.MY_KV.put(key, newValue);
  return parseInt(newValue);
}
```

## 5. D1 Database

### Setup D1 Database
```bash
# Create database
wrangler d1 create my-database

# Initialize with SQL
wrangler d1 execute my-database --file=schema.sql

# Query database
wrangler d1 execute my-database --command="SELECT * FROM users"
```

### Schema Example
```sql
-- schema.sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
```

### D1 Operations in Workers
```typescript
// src/d1-example.ts
export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    switch (path) {
      case '/api/users':
        return await handleUsers(request, env);
      case '/api/posts':
        return await handlePosts(request, env);
      default:
        return new Response('Not Found', { status: 404 });
    }
  },
};

async function handleUsers(request: Request, env: Env): Promise<Response> {
  switch (request.method) {
    case 'GET':
      const users = await env.DB.prepare('SELECT * FROM users ORDER BY created_at DESC')
        .all();
      return new Response(JSON.stringify(users), {
        headers: { 'Content-Type': 'application/json' }
      });

    case 'POST':
      const { email, name } = await request.json();
      
      const result = await env.DB.prepare(`
        INSERT INTO users (email, name) VALUES (?, ?)
      `).bind(email, name).run();

      return new Response(JSON.stringify({ 
        success: true, 
        id: result.meta.last_row_id 
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    default:
      return new Response('Method Not Allowed', { status: 405 });
  }
}

async function handlePosts(request: Request, env: Env): Promise<Response> {
  switch (request.method) {
    case 'GET':
      const posts = await env.DB.prepare(`
        SELECT p.*, u.name as author_name 
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        ORDER BY p.created_at DESC
      `).all();
      
      return new Response(JSON.stringify(posts), {
        headers: { 'Content-Type': 'application/json' }
      });

    case 'POST':
      const { user_id, title, content } = await request.json();
      
      const result = await env.DB.prepare(`
        INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)
      `).bind(user_id, title, content).run();

      return new Response(JSON.stringify({ 
        success: true, 
        id: result.meta.last_row_id 
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    default:
      return new Response('Method Not Allowed', { status: 405 });
  }
}
```

## 6. Caching Strategies

### Cache API Responses
```typescript
// Cache configuration
const CACHE_TTL = 60 * 60; // 1 hour

async function fetchWithCache(
  request: Request, 
  env: Env
): Promise<Response> {
  const cacheKey = new Request(request.url, request);
  const cache = caches.default;

  // Try to get from cache first
  let response = await cache.match(cacheKey);
  
  if (response) {
    response.headers.set('X-Cache', 'HIT');
    return response;
  }

  // Fetch from origin
  response = await fetch(request);
  
  // Cache successful responses
  if (response.ok) {
    response = new Response(response.body, response);
    response.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
    response.headers.set('X-Cache', 'MISS');
    
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}
```

### Edge Caching Headers
```typescript
// Set cache headers based on content type
function setCacheHeaders(response: Response, contentType: string): Response {
  const headers = new Headers(response.headers);
  
  switch (contentType) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/svg+xml':
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      break;
      
    case 'text/css':
    case 'application/javascript':
      headers.set('Cache-Control', 'public, max-age=31536000');
      break;
      
    case 'text/html':
      headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
      break;
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
```

## 7. Rate Limiting

### Implement Rate Limiting with KV
```typescript
// Rate limiting middleware
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

async function rateLimit(
  request: Request, 
  env: Env, 
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number }> {
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `rate_limit:${clientIP}`;
  
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Get current requests
  const current = await env.MY_KV.get(key);
  let requests: number[] = current ? JSON.parse(current) : [];
  
  // Filter out old requests
  requests = requests.filter(timestamp => timestamp > windowStart);
  
  // Add current request
  requests.push(now);
  
  // Store updated requests
  await env.MY_KV.put(key, JSON.stringify(requests), {
    expirationTtl: Math.ceil(config.windowMs / 1000)
  });
  
  const allowed = requests.length <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - requests.length);
  
  return { allowed, remaining };
}

// Usage in worker
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Apply rate limiting
    const { allowed, remaining } = await rateLimit(request, env, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100      // 100 requests per minute
    });

    if (!allowed) {
      return new Response('Too Many Requests', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
        }
      });
    }

    // Continue with request
    const response = await handleRequest(request, env);
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    
    return response;
  },
};
```

## 8. Webhook Handling

### Handle GitHub Webhooks
```typescript
async function handleGitHubWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get('X-Hub-Signature-256');
  const body = await request.text();
  
  // Verify webhook signature
  const secret = env.GITHUB_WEBHOOK_SECRET;
  const expectedSignature = 'sha256=' + 
    await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ),
      new TextEncoder().encode(body)
    ).then(buffer => Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    );

  if (signature !== expectedSignature) {
    return new Response('Invalid signature', { status: 401 });
  }

  const payload = JSON.parse(body);
  
  // Handle different webhook events
  switch (payload.action) {
    case 'push':
      // Trigger deployment
      await triggerDeployment(env, payload);
      break;
      
    case 'pull_request':
      // Run tests
      await runTests(env, payload);
      break;
  }

  return new Response('OK');
}
```

## 9. Deployment & CI/CD

### GitHub Actions Deployment
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env production
```

### Environment Management
```bash
# Development
wrangler dev

# Preview deployment
wrangler deploy --env preview

# Production deployment
wrangler deploy --env production
```

## 10. Monitoring & Analytics

### Custom Analytics
```typescript
// Analytics collection
async function trackEvent(
  env: Env, 
  event: string, 
  data: Record<string, any>
): Promise<void> {
  const analyticsKey = `analytics:${event}:${Date.now()}`;
  await env.MY_KV.put(analyticsKey, JSON.stringify(data), {
    expirationTtl: 30 * 24 * 60 * 60 // 30 days
  });
}

// Usage in request handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startTime = Date.now();
    
    // Handle request
    const response = await handleRequest(request, env);
    
    // Track analytics
    await trackEvent(env, 'request', {
      method: request.method,
      url: request.url,
      status: response.status,
      duration: Date.now() - startTime,
      userAgent: request.headers.get('User-Agent'),
      country: request.cf?.country,
      city: request.cf?.city
    });
    
    return response;
  },
};
```

## 11. Best Practices

### Performance
- Use edge caching cho static assets
- Implement database indexes
- Minimize cold starts
- Use appropriate TTL values

### Security
- Validate all inputs
- Use environment variables cho secrets
- Implement rate limiting
- Set proper CORS headers

### Reliability
- Implement error handling
- Use retry logic cho external APIs
- Monitor performance metrics
- Set up alerts

## 12. Common Use Cases

### API Gateway
- Route requests to different services
- Implement authentication middleware
- Load balancing across origins

### Edge Functions
- Image optimization
- Content transformation
- Geo-based content delivery

### Serverless Backend
- REST APIs
- GraphQL resolvers
- Webhook handlers

## Resources
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Discord](https://discord.gg/cloudflaredev)
