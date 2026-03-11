import { type Request, type Response, type NextFunction } from "express";

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown> | void;

/**
 * 非同期ルートハンドラをラップし、Promise の reject を next(err) に渡す。
 * 各ハンドラで try/catch を書かずに済む。
 */
export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
