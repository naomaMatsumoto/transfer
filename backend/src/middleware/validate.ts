import { type Request, type Response, type NextFunction } from "express";
import { type ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      res.status(400).json({ error: "VALIDATION_ERROR", details: errors });
      return;
    }
    req.body = result.data;
    next();
  };
}
