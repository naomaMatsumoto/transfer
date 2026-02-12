"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
/**
 * ログイン必須。未ログインなら 401 を返す。
 */
function requireAuth(req, res, next) {
    if (req.session?.account) {
        next();
        return;
    }
    res.status(401).json({ error: "UNAUTHORIZED" });
}
