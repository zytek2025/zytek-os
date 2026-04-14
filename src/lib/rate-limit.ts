// Rate Limiter con fallback in-memory
// Para usar Redis, instalar: npm install ioredis
// Y configurar REDIS_URL en .env.local

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
  limited: boolean
}

export class RateLimiter {
  private store: Map<string, { count: number; resetAt: number }>
  private windowMs: number
  private maxRequests: number

  constructor(maxRequests: number, windowMs: number = 60000) {
    this.store = new Map()
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  check(key: string): RateLimitResult {
    const now = Date.now()
    const resetAt = now + this.windowMs
    const entry = this.store.get(key)

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt })
      return { ok: true, remaining: this.maxRequests - 1, resetAt, limited: false }
    }

    entry.count++
    this.store.set(key, entry)
    const remaining = Math.max(0, this.maxRequests - entry.count)

    return {
      ok: entry.count <= this.maxRequests,
      remaining,
      resetAt: entry.resetAt,
      limited: entry.count > this.maxRequests,
    }
  }

  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key)
      }
    }
  }
}

export const authRateLimiter = new RateLimiter(10, 60000)
export const apiRateLimiter = new RateLimiter(120, 60000)

// Redis integration (optional, for multi-instance deployments)
// Uncomment when using Redis:
// import { Redis } from 'ioredis'
// 
// let redis: Redis | null = null
// 
// export async function checkRateLimitRedis(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
//   if (!redis) {
//     const redisUrl = process.env.REDIS_URL
//     if (!redisUrl) throw new Error('REDIS_URL not configured')
//     redis = new Redis(redisUrl)
//   }
//   
//   const redisKey = `ratelimit:${key}`
//   const now = Date.now()
//   
//   const multi = redis.multi()
//   multi.incr(redisKey)
//   multi.pttl(redisKey)
//   const results = await multi.exec()
//   
//   if (!results) throw new Error('Redis transaction failed')
//   
//   const count = results[0][1] as number
//   const ttl = results[1][1] as number
//   
//   if (count === 1) {
//     await redis.pexpire(redisKey, windowMs)
//   }
//   
//   return {
//     ok: count <= max,
//     remaining: Math.max(0, max - count),
//     resetAt: ttl > 0 ? now + ttl : now + windowMs,
//     limited: count > max,
//   }
// }
