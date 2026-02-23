//! ERROR HANDLER MIDDLEWARE (globale)

import { Request, Response, NextFunction } from "express";
import {
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  BadRequestError,
  ForbiddenError,
  InactiveUserError
} from "@utils/utils";


export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
//
  console.error("Error:", err.message);

    // Gestione errori custom
    if (err instanceof NotFoundError) {
        res.status(404).json({
        code: "NOT_FOUND",
        message: err.message
        });
        return;
    }

    if (err instanceof ConflictError) {
        res.status(409).json({
        code: "CONFLICT",
        message: err.message
        });
        return;
    }

    if (err instanceof UnauthorizedError) {
        res.status(401).json({
        code: "UNAUTHORIZED",
        message: err.message
        });
        return;
    }

    if (err instanceof BadRequestError) {
        res.status(400).json({
        code: "BAD_REQUEST",
        message: err.message
        });
        return;
    }

    if (err instanceof ForbiddenError) {
        res.status(403).json({
        code: "FORBIDDEN",
        message: err.message
        });
        return;
    }
    if (err instanceof InactiveUserError) {
        res.status(err.statusCode).json({
        code: "INACTIVE_USER",
        message: err.publicMessage,
        details: err.details
        });
        return;
    }

    // Errori da express-openapi-validator
    if ((err as any).status) {
        res.status((err as any).status).json({
        code: "VALIDATION_ERROR",
        message: err.message,
        errors: (err as any).errors
        });
        return;
    }

    // Errore generico
    res.status(500).json({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred"
    });
}
