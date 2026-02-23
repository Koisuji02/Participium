//! AUTH MIDDLEWARE
import { Request, Response, NextFunction } from "express";
import { verifyToken, getSession } from "@services/authService";
import { OfficerRole } from "@models/enums/OfficerRole";
import { UnauthorizedError, ForbiddenError } from "@utils/utils";
/**
 * Middleware per autenticare richieste con JWT Bearer token
 * Aggiunge req.user con i dati del token decodificato
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid Authorization header");
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token) as {
      id: number;
      username: string;
      isStaff?: boolean;
      type: OfficerRole[] | string[]; // normalizzato a array in generateToken
      sessionType?: "web" | "telegram";
    };

    // opzionale: verifica esistenza sessione
    const session = await getSession(decoded.id, decoded.sessionType ?? "web");
    if (session?.token !== token) {
      throw new UnauthorizedError("Session not found or expired");
    }

    (req as any).user = decoded;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireUserType(allowedTypes: OfficerRole[] | string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = (req as any).user;
      if (!user) throw new UnauthorizedError("Authentication required");

      const userTypes: (OfficerRole | string)[] = Array.isArray(user.type) ? user.type : [user.type];
      
      // Normalize allowedTypes: convert OfficerRole enum values to their string values
      const normalizedAllowed = allowedTypes.flatMap(t => {
        if (t === OfficerRole.MAINTAINER || t === "MAINTAINER" || t === "external_maintainer") {
          return ["MAINTAINER", "external_maintainer"];
        }
        return t;
      });
      
      const allowed = normalizedAllowed.some(t => userTypes.includes(t));
      if (!allowed) {
        throw new ForbiddenError("You do not have permission to perform this operation");
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function isUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }
    // Deve essere un utente (non staff)
    if (user.isStaff === true) {
      throw new ForbiddenError("Staff accounts are not allowed for this operation");
    }
    next();
  } catch (error) {
    next(error);
  }
  return Promise.resolve();
}   

export function regexMail(email: string): boolean {
    const mailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return mailRegex.test(email);
}