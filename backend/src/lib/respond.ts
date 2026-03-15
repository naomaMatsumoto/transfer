import { type Response } from "express";

export function ok<T>(res: Response, data: T): void {
  res.json(data);
}

export function created<T>(res: Response, data: T): void {
  res.status(201).json(data);
}

export function badRequest(res: Response, error: string, extra?: Record<string, unknown>): void {
  res.status(400).json({ error, ...extra });
}

export function unauthorized(res: Response, error = "UNAUTHORIZED"): void {
  res.status(401).json({ error });
}

export function forbidden(res: Response, error = "FORBIDDEN", message?: string): void {
  res.status(403).json(message ? { error, message } : { error });
}

export function notFound(res: Response, error: string): void {
  res.status(404).json({ error });
}

export function conflict(res: Response, error: string): void {
  res.status(409).json({ error });
}

export function serverError(res: Response, error = "SERVER_ERROR"): void {
  res.status(500).json({ error });
}
