import type { Request, Response, NextFunction, RequestHandler } from 'express';

/** Wraps an async route handler so rejected promises reach the error middleware. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function badRequest(message: string, details?: unknown): HttpError {
  return new HttpError(400, message, details);
}

export function notFound(message = 'Niet gevonden'): HttpError {
  return new HttpError(404, message);
}

/** Parses and validates a positive integer route parameter. */
export function requireId(value: string | undefined, label = 'id'): string {
  if (!value || value.trim() === '') {
    throw badRequest(`Ongeldig ${label}`);
  }
  return value;
}

/** Ensures a required string field is present and non-empty. */
export function requireString(body: Record<string, unknown>, field: string, maxLength = 2000): string {
  const value = body[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest(`Veld "${field}" is verplicht`);
  }
  if (value.length > maxLength) {
    throw badRequest(`Veld "${field}" is te lang (max ${maxLength} tekens)`);
  }
  return value.trim();
}

/** Validates an optional string field. */
export function optionalString(
  body: Record<string, unknown>,
  field: string,
  maxLength = 2000,
): string | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw badRequest(`Veld "${field}" moet tekst zijn`);
  if (value.length > maxLength) throw badRequest(`Veld "${field}" is te lang (max ${maxLength} tekens)`);
  return value;
}

/** Validates an optional number field. */
export function optionalNumber(body: Record<string, unknown>, field: string): number | undefined {
  const value = body[field];
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) throw badRequest(`Veld "${field}" moet een getal zijn`);
  return parsed;
}

/** Validates an optional boolean field. */
export function optionalBoolean(body: Record<string, unknown>, field: string): boolean | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 'false') return value === 'true';
  throw badRequest(`Veld "${field}" moet true of false zijn`);
}
