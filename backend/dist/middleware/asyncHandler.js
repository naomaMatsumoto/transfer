"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = asyncHandler;
/**
 * 非同期ルートハンドラをラップし、Promise の reject を next(err) に渡す。
 * 各ハンドラで try/catch を書かずに済む。
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
