import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { Redis } from "ioredis";
import type { Config } from "../config.js";
import { AppError } from "../errors.js";

/**
 * A coarse per-IP flood shield in front of every service. Services keep their own, finer limits
 * (the auth service counts login attempts per IP *and* email); this layer stops one client from
 * hammering the whole platform. Routes opt out with `config: { rateLimit: false }`.
 */
export function registerRateLimit(app: FastifyInstance, config: Config, redis?: Redis) {
  app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
    // Shared counters across gateway replicas. Without Redis, each process counts on its own.
    ...(redis && { redis, nameSpace: "agentflow:gateway:rate-limit:" }),
    // If Redis is down, let traffic through: a counter outage must not become a platform outage.
    skipOnError: true,
    errorResponseBuilder: (_request, context) =>
      new AppError(429, "RATE_LIMITED", `Too many requests. Try again in ${context.after}.`),
  });
}
