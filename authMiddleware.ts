import express from "express";
import { auth } from "./lib/auth";
import type { Session,User } from "better-auth";
import { fromNodeHeaders } from "better-auth/node";


declare global {
    namespace Express {
        interface Request {
            user?: User;
            session?:Session;
        }
    }
}

export const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers)
    });

    if (!session) {
        return res.status(401).json({ msg: "Unauthorized!!!!" });
    }

    // Attach session/user to request for use in routes
    req.session = session.session;
    req.user = session.user;

    next();
};