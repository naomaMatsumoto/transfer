"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = me;
async function me(req, res, _next) {
    if (!req.session?.account) {
        res.status(401).json({ error: "UNAUTHORIZED" });
        return;
    }
    res.json({
        accountId: req.session.account.accountId,
        corporationId: req.session.account.corporationId,
        email: req.session.account.email,
    });
}
