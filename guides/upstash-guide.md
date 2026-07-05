# Upstash Redis & Rate Limiting Implementation Guide

## Overview
Upstash cung cấp serverless Redis-compatible database, Kafka messaging, QStash job queue, và rate limiting solutions cho modern applications.

## 1. Setup Account

### Bước 1: Tạo Upstash Account
1. Truy cập [upstash.com](https://upstash.com)
2. Sign up/Sign in
3. Create new database:
   - Name: `my-app-redis`
   - Region: Chọn region gần nhất
   - Plan: Free tier để bắt đầu

### Bước 2: Get Connection Details
```bash
# Environment variables
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
UPSTASH_KAFKA_REST_URL=https://your-kafka-url.upstash.io
UPSTASH_KAFKA_REST_TOKEN=your-kafka-token
```

## 2. Installation

### Node.js SDK
```bash
npm install @upstash/redis
npm install @upstash/kafka
# hoặc
yarn add @upstash/redis @upstash/kafka
```

### React Client
```bash
npm install @upstash/redis
# hoặc
yarn add @upstash/redis
```

## 3. Redis Integration

### Basic Redis Setup
```javascript
// lib/upstash-redis.js
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default redis
```

### Basic Operations
```javascript
// app/api/redis-example.js
import redis from '@/lib/upstash-redis'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { key, value } = req.body
    
    // Set value with TTL (1 hour)
    await redis.set(key, value, { ex: 3600 })
    
    return res.json({ success: true, message: 'Value set' })
  }
  
  if (req.method === 'GET') {
    const { key } = req.query
    
    // Get value
    const value = await redis.get(key)
    
    if (value === null) {
      return res.json({ error: 'Key not found' }, { status: 404 })
    }
    
    return res.json({ key, value })
  }
  
  if (req.method === 'DELETE') {
    const { key } = req.query
    
    // Delete key
    const result = await redis.del(key)
    
    return res.json({ 
      success: true, 
      deleted: result === 1 
    })
  }
}
```

### Advanced Redis Operations
```javascript
// Hash operations
const setUserProfile = async (userId, profileData) => {
  await redis.hset(`user:${userId}`, profileData)
}

const getUserProfile = async (userId) => {
  return await redis.hgetall(`user:${userId}`)
}

const updateUserField = async (userId, field, value) => {
  await redis.hset(`user:${userId}`, { [field]: value })
}

// List operations
const addToQueue = async (queueName, item) => {
  await redis.lpush(queueName, JSON.stringify(item))
}

const getFromQueue = async (queueName) => {
  const item = await redis.rpop(queueName)
  return item ? JSON.parse(item) : null
}

// Set operations (for tags, categories)
const addTags = async (itemId, tags) => {
  await redis.sadd(`item:${itemId}:tags`, ...tags)
}

const getTags = async (itemId) => {
  return await redis.smembers(`item:${itemId}:tags`)
}

// Sorted sets (leaderboards, rankings)
const addScore = async (leaderboard, userId, score) => {
  await redis.zadd(leaderboard, { score, member: userId })
}

const getTopUsers = async (leaderboard, limit = 10) => {
  return await redis.zrevrange(leaderboard, 0, limit - 1, { withScores: true })
}
```

## 4. Rate Limiting

### Basic Rate Limiter
```javascript
// lib/rate-limiter.js
import redis from '@/lib/upstash-redis'

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000 // 1 minute
    this.maxRequests = options.maxRequests || 100
    this.keyPrefix = options.keyPrefix || 'rate_limit'
  }

  async isAllowed(identifier) {
    const key = `${this.keyPrefix}:${identifier}`
    const now = Date.now()
    const windowStart = now - this.windowMs

    // Remove old entries
    await redis.zremrangebyscore(key, 0, windowStart)

    // Add current request
    await redis.zadd(key, { score: now, member: now.toString() })

    // Set expiration
    await redis.expire(key, Math.ceil(this.windowMs / 1000))

    // Count current requests
    const current = await redis.zcard(key)

    return {
      allowed: current <= this.maxRequests,
      remaining: Math.max(0, this.maxRequests - current),
      resetTime: now + this.windowMs
    }
  }
}

export default RateLimiter
```

### Rate Limiting Middleware
```javascript
// middleware/rateLimit.js
import RateLimiter from '@/lib/rate-limiter'

const apiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100        // 100 requests per minute
})

const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5              // 5 login attempts per 15 minutes
})

export const rateLimitMiddleware = (limiter, getIdentifier) => {
  return async (req, res, next) => {
    const identifier = getIdentifier(req)
    const result = await limiter.isAllowed(identifier)

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': limiter.maxRequests,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    })

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      })
    }

    next()
  }
}

// Usage examples
export const apiRateLimit = rateLimitMiddleware(
  apiLimiter,
  (req) => req.ip || req.headers['x-forwarded-for']
)

export const authRateLimit = rateLimitMiddleware(
  authLimiter,
  (req) => req.body?.email || req.ip
)
```

### Advanced Rate Limiting
```javascript
// lib/advanced-rate-limiter.js
import redis from '@/lib/upstash-redis'

class AdvancedRateLimiter {
  constructor(options = {}) {
    this.options = {
      windowMs: options.windowMs || 60 * 1000,
      maxRequests: options.maxRequests || 100,
      keyGenerator: options.keyGenerator || ((req) => req.ip),
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      ...options
    }
  }

  async middleware(req, res, next) {
    const key = this.options.keyGenerator(req)
    const now = Date.now()
    
    // Check if request should be skipped
    const shouldSkip = this.shouldSkipRequest(req, res)
    if (shouldSkip) {
      return next()
    }

    // Sliding window implementation
    const pipeline = redis.multi()
    const windowStart = now - this.options.windowMs

    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart)
    
    // Add current request
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` })
    
    // Count current requests
    pipeline.zcard(key)
    
    // Set expiration
    pipeline.expire(key, Math.ceil(this.options.windowMs / 1000))

    const results = await pipeline.exec()
    const current = results[2][1]

    const result = {
      allowed: current <= this.options.maxRequests,
      remaining: Math.max(0, this.options.maxRequests - current),
      resetTime: now + this.options.windowMs
    }

    // Add headers
    res.set({
      'X-RateLimit-Limit': this.options.maxRequests,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    })

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      })
    }

    // Store rate limit info for later use
    req.rateLimit = result
    next()
  }

  shouldSkipRequest(req, res) {
    // Skip successful requests if configured
    if (this.options.skipSuccessfulRequests && res.statusCode < 400) {
      return true
    }

    // Skip failed requests if configured
    if (this.options.skipFailedRequests && res.statusCode >= 400) {
      return true
    }

    // Skip specific routes
    if (this.options.skipRoutes?.some(route => req.path.startsWith(route))) {
      return true
    }

    return false
  }
}

export default AdvancedRateLimiter
```

## 5. Caching with Redis

### Cache Manager
```javascript
// lib/cache.js
import redis from '@/lib/upstash-redis'

class CacheManager {
  constructor(defaultTTL = 3600) {
    this.defaultTTL = defaultTTL
  }

  async get(key) {
    const cached = await redis.get(key)
    return cached ? JSON.parse(cached) : null
  }

  async set(key, value, ttl = this.defaultTTL) {
    await redis.set(key, JSON.stringify(value), { ex: ttl })
  }

  async del(key) {
    await redis.del(key)
  }

  async exists(key) {
    const result = await redis.exists(key)
    return result === 1
  }

  async remember(key, fetchFunction, ttl = this.defaultTTL) {
    // Try to get from cache first
    let value = await this.get(key)
    
    if (value === null) {
      // Cache miss - fetch fresh data
      value = await fetchFunction()
      
      // Store in cache
      await this.set(key, value, ttl)
    }
    
    return value
  }

  async invalidate(pattern) {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
}

export const cache = new CacheManager()
```

### API Caching Example
```javascript
// app/api/users.js
import { cache } from '@/lib/cache'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const cacheKey = 'users:list'
    
    // Try cache first
    const cachedUsers = await cache.get(cacheKey)
    if (cachedUsers) {
      res.setHeader('X-Cache', 'HIT')
      return res.json(cachedUsers)
    }

    // Cache miss - fetch from database
    const users = await fetchUsersFromDatabase()
    
    // Cache for 5 minutes
    await cache.set(cacheKey, users, 300)
    
    res.setHeader('X-Cache', 'MISS')
    return res.json(users)
  }
  
  // Invalidate cache on POST/PUT/DELETE
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    await cache.invalidate('users:*')
    
    // Handle the request...
  }
}
```

## 6. Session Management

### Redis Session Store
```javascript
// lib/session-store.js
import redis from '@/lib/upstash-redis'

class SessionStore {
  constructor() {
    this.prefix = 'session:'
  }

  async createSession(sessionData, ttl = 24 * 60 * 60) { // 24 hours
    const sessionId = this.generateSessionId()
    const key = this.prefix + sessionId
    
    await redis.set(key, JSON.stringify({
      ...sessionData,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    }), { ex: ttl })
    
    return sessionId
  }

  async getSession(sessionId) {
    const key = this.prefix + sessionId
    const sessionData = await redis.get(key)
    
    if (!sessionData) {
      return null
    }

    const session = JSON.parse(sessionData)
    
    // Update last accessed time
    await redis.hset(key, 'lastAccessed', Date.now())
    
    return session
  }

  async updateSession(sessionId, updates) {
    const key = this.prefix + sessionId
    await redis.hset(key, updates)
  }

  async destroySession(sessionId) {
    const key = this.prefix + sessionId
    await redis.del(key)
  }

  async cleanupExpiredSessions() {
    const pattern = this.prefix + '*'
    const keys = await redis.keys(pattern)
    
    for (const key of keys) {
      const ttl = await redis.ttl(key)
      if (ttl === -1) { // No expiration set
        await redis.expire(key, 24 * 60 * 60) // Set 24 hour expiration
      }
    }
  }

  generateSessionId() {
    return Buffer.from(Math.random().toString()).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substr(0, 32)
  }
}

export const sessionStore = new SessionStore()
```

## 7. Real-time Features

### Pub/Sub Implementation
```javascript
// lib/pubsub.js
import redis from '@/lib/upstash-redis'

class PubSubManager {
  constructor() {
    this.subscribers = new Map()
  }

  async publish(channel, message) {
    await redis.publish(channel, JSON.stringify(message))
  }

  async subscribe(channel, callback) {
    // Store subscription
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set())
    }
    this.subscribers.get(channel).add(callback)

    // Start listening (simplified - in production use WebSocket)
    this.startListening(channel)
  }

  async unsubscribe(channel, callback) {
    if (this.subscribers.has(channel)) {
      this.subscribers.get(channel).delete(callback)
    }
  }

  async startListening(channel) {
    // This is a simplified implementation
    // In production, you'd use WebSockets or Server-Sent Events
    setInterval(async () => {
      // Check for new messages
      const messages = await redis.lrange(`${channel}:messages`, 0, -1)
      
      if (messages.length > 0) {
        // Clear processed messages
        await redis.del(`${channel}:messages`)
        
        // Notify subscribers
        const callbacks = this.subscribers.get(channel) || new Set()
        messages.forEach(message => {
          const parsed = JSON.parse(message)
          callbacks.forEach(callback => callback(parsed))
        })
      }
    }, 1000) // Check every second
  }
}

export const pubsub = new PubSubManager()
```

### Notification System
```javascript
// lib/notifications.js
import redis from '@/lib/upstash-redis'

class NotificationManager {
  constructor() {
    this.queueKey = 'notifications:queue'
    this.userKey = (userId) => `notifications:user:${userId}`
  }

  async addNotification(userId, notification) {
    const notificationWithId = {
      id: this.generateId(),
      userId,
      ...notification,
      createdAt: Date.now(),
      read: false
    }

    // Add to user's notification list
    await redis.lpush(this.userKey(userId), JSON.stringify(notificationWithId))
    
    // Limit to last 50 notifications per user
    await redis.ltrim(this.userKey(userId), 0, 49)
    
    // Add to processing queue
    await redis.lpush(this.queueKey, JSON.stringify({
      type: 'notification',
      data: notificationWithId
    }))

    return notificationWithId
  }

  async getUserNotifications(userId, limit = 20) {
    const notifications = await redis.lrange(this.userKey(userId), 0, limit - 1)
    return notifications.map(n => JSON.parse(n))
  }

  async markAsRead(userId, notificationId) {
    const notifications = await this.getUserNotifications(userId)
    const notification = notifications.find(n => n.id === notificationId)
    
    if (notification && !notification.read) {
      notification.read = true
      notification.readAt = Date.now()
      
      // Update in Redis (simplified - would need more complex logic)
      await redis.lset(this.userKey(userId), 0, JSON.stringify(notification))
    }
  }

  async getUnreadCount(userId) {
    const notifications = await this.getUserNotifications(userId)
    return notifications.filter(n => !n.read).length
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

export const notifications = new NotificationManager()
```

## 8. Kafka Integration

### Kafka Producer
```javascript
// lib/kafka-producer.js
import { Kafka } from '@upstash/kafka'

const kafka = new Kafka({
  url: process.env.UPSTASH_KAFKA_REST_URL,
  username: process.env.UPSTASH_KAFKA_REST_USERNAME,
  password: process.env.UPSTASH_KAFKA_REST_PASSWORD,
})

const producer = kafka.producer()

export async function publishEvent(topic, event) {
  try {
    await producer.produce(topic, null, JSON.stringify(event))
    console.log(`Event published to ${topic}:`, event)
  } catch (error) {
    console.error('Failed to publish event:', error)
    throw error
  }
}

// Usage examples
export const events = {
  userRegistered: (user) => publishEvent('user-events', {
    type: 'user_registered',
    data: user,
    timestamp: Date.now()
  }),
  
  orderCompleted: (order) => publishEvent('order-events', {
    type: 'order_completed',
    data: order,
    timestamp: Date.now()
  }),
  
  paymentFailed: (payment) => publishEvent('payment-events', {
    type: 'payment_failed',
    data: payment,
    timestamp: Date.now()
  })
}
```

### Kafka Consumer
```javascript
// lib/kafka-consumer.js
import { Kafka } from '@upstash/kafka'

const kafka = new Kafka({
  url: process.env.UPSTASH_KAFKA_REST_URL,
  username: process.env.UPSTASH_KAFKA_REST_USERNAME,
  password: process.env.UPSTASH_KAFKA_REST_PASSWORD,
})

const consumer = kafka.consumer()

export async function startConsumer(topic, handler) {
  try {
    await consumer.subscribe({
      topic,
      fromBeginning: false
    })

    console.log(`Started consuming from topic: ${topic}`)

    // Process messages
    for await (const message of consumer.run()) {
      try {
        const event = JSON.parse(message.value)
        await handler(event)
      } catch (error) {
        console.error('Error processing message:', error)
      }
    }
  } catch (error) {
    console.error('Consumer error:', error)
  }
}

// Usage examples
startConsumer('user-events', async (event) => {
  switch (event.type) {
    case 'user_registered':
      await handleUserRegistration(event.data)
      break
    case 'user_updated':
      await handleUserUpdate(event.data)
      break
  }
})

startConsumer('order-events', async (event) => {
  switch (event.type) {
    case 'order_completed':
      await handleOrderCompletion(event.data)
      break
    case 'order_cancelled':
      await handleOrderCancellation(event.data)
      break
  }
})
```

## 9. Performance Monitoring

### Redis Performance Metrics
```javascript
// lib/redis-monitor.js
import redis from '@/lib/upstash-redis'

class RedisMonitor {
  async getMetrics() {
    const info = await redis.info()
    
    return {
      connected_clients: this.parseInfo(info, 'connected_clients'),
      used_memory: this.parseInfo(info, 'used_memory'),
      total_commands_processed: this.parseInfo(info, 'total_commands_processed'),
      keyspace_hits: this.parseInfo(info, 'keyspace_hits'),
      keyspace_misses: this.parseInfo(info, 'keyspace_misses'),
      hit_rate: this.calculateHitRate(info)
    }
  }

  parseInfo(info, key) {
    const match = info.match(new RegExp(`${key}:(\\d+)`))
    return match ? parseInt(match[1]) : 0
  }

  calculateHitRate(info) {
    const hits = this.parseInfo(info, 'keyspace_hits')
    const misses = this.parseInfo(info, 'keyspace_misses')
    const total = hits + misses
    
    return total > 0 ? (hits / total * 100).toFixed(2) + '%' : '0%'
  }

  async slowLog() {
    return await redis.slowlog('get')
  }
}

export const redisMonitor = new RedisMonitor()
```

## 10. Best Practices

### Key Naming Conventions
```javascript
// Use consistent naming patterns
const keyPatterns = {
  user: 'user:{userId}',
  userSession: 'session:{sessionId}',
  cache: 'cache:{namespace}:{key}',
  rateLimit: 'rate_limit:{identifier}:{window}',
  queue: 'queue:{name}',
  notifications: 'notifications:user:{userId}'
}
```

### TTL Management
```javascript
// Set appropriate TTL values
const ttlValues = {
  session: 24 * 60 * 60,        // 24 hours
  cache: 60 * 60,              // 1 hour
  rateLimit: 60,                // 1 minute
  verificationCode: 10 * 60,     // 10 minutes
  passwordReset: 30 * 60         // 30 minutes
}
```

### Error Handling
```javascript
// Robust error handling
async function safeRedisOperation(operation) {
  try {
    return await operation()
  } catch (error) {
    console.error('Redis operation failed:', error)
    
    // Fallback strategy
    if (error.code === 'ECONNREFUSED') {
      // Redis unavailable - use fallback
      return await fallbackOperation()
    }
    
    throw error
  }
}
```

### Connection Management
```javascript
// Connection pooling and retry logic
import redis from '@upstash/redis'

const redisWithRetry = {
  async get(key, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await redis.get(key)
      } catch (error) {
        if (i === retries - 1) throw error
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100))
      }
    }
  }
}
```

## 11. Common Use Cases

### E-commerce Cart Management
```javascript
// lib/shopping-cart.js
import redis from '@/lib/upstash-redis'

class ShoppingCart {
  constructor(userId) {
    this.userId = userId
    this.cartKey = `cart:user:${userId}`
  }

  async addItem(product, quantity = 1) {
    const cart = await this.getCart()
    const existingItem = cart.items.find(item => item.id === product.id)
    
    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      cart.items.push({ ...product, quantity })
    }
    
    cart.updatedAt = Date.now()
    await redis.set(this.cartKey, JSON.stringify(cart), { ex: 7 * 24 * 60 * 60 }) // 7 days
    
    return cart
  }

  async getCart() {
    const cartData = await redis.get(this.cartKey)
    return cartData ? JSON.parse(cartData) : { items: [], createdAt: Date.now() }
  }

  async clearCart() {
    await redis.del(this.cartKey)
  }

  async getCartTotal() {
    const cart = await this.getCart()
    return cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity)
    }, 0)
  }
}
```

### Leaderboard System
```javascript
// lib/leaderboard.js
import redis from '@/lib/upstash-redis'

class Leaderboard {
  constructor(name) {
    this.name = name
    this.key = `leaderboard:${name}`
  }

  async addScore(userId, score) {
    await redis.zadd(this.key, { score, member: userId })
  }

  async getTopUsers(limit = 10) {
    return await redis.zrevrange(this.key, 0, limit - 1, { withScores: true })
  }

  async getUserRank(userId) {
    const rank = await redis.zrevrank(this.key, userId)
    return rank !== null ? rank + 1 : null // 1-based rank
  }

  async getUserScore(userId) {
    const score = await redis.zscore(this.key, userId)
    return score ? parseFloat(score) : 0
  }

  async getAroundUser(userId, count = 5) {
    const rank = await this.getUserRank(userId)
    if (!rank) return []

    const start = Math.max(0, rank - count - 1)
    const end = rank + count - 1

    return await redis.zrevrange(this.key, start, end, { withScores: true })
  }
}
```

## Resources
- [Upstash Documentation](https://docs.upstash.com)
- [Upstash Redis Guide](https://docs.upstash.com/redis)
- [Upstash Kafka Guide](https://docs.upstash.com/kafka)
- [Upstash GitHub](https://github.com/upstash)
- [Upstash Discord](https://discord.gg/upstash)
