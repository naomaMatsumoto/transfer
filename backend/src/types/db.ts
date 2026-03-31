import type { ResultSetHeader, RowDataPacket } from "mysql2";

export type { ResultSetHeader, RowDataPacket };

export interface InsertResult extends ResultSetHeader {
  insertId: number;
}

export interface UpdateResult extends ResultSetHeader {
  affectedRows: number;
  changedRows: number;
}

export type DeleteResult = UpdateResult;

export interface MysqlError extends Error {
  code: string;
  errno: number;
  sqlState: string;
}

export function isMysqlError(e: unknown): e is MysqlError {
  return e instanceof Error && "code" in e;
}

export interface ListResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
