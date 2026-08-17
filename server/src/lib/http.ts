import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Wraps an async route so a rejected promise reaches Express' error handler
 * instead of hanging the request. Replaces the try/catch in every handler.
 */
export function handler(fn: (req: AuthRequest, res: Response) => Promise<unknown>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

/** A failure we intend to show the user, rather than an unexpected crash. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const badRequest = (msg: string) => new ApiError(400, msg);
export const notFound = (msg: string) => new ApiError(404, msg);
export const forbidden = (msg: string) => new ApiError(403, msg);

/** Reads a required non-empty string from a request body. */
export function requireString(value: unknown, field: string, max = 2000): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw badRequest(`${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw badRequest(`${field} is too long (maximum ${max} characters).`);
  }
  return trimmed;
}

/** Reads an optional string, returning undefined when absent. */
export function optionalString(value: unknown, max = 2000): string | undefined {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  if (!str) return undefined;
  return str.slice(0, max);
}

/** Reads a positive, finite amount of money. */
export function requireAmount(value: unknown, field: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw badRequest(`${field} must be a number greater than zero.`);
  }
  if (num > 1_000_000_000) {
    throw badRequest(`${field} looks too large. Please check the figure.`);
  }
  return Math.round(num * 100) / 100;
}

export function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

/** Keeps only the listed keys from a body, so clients cannot set fields they shouldn't. */
export function pick<T extends object>(body: unknown, keys: readonly string[]): Partial<T> {
  const source = (body ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out as Partial<T>;
}
