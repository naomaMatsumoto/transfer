"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = logout;
async function logout(req, res, _next) {
    req.session = undefined;
    res.json({ ok: true });
}
