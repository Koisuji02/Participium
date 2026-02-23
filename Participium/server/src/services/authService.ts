//! AUTH SERVICE (JWT and Password Hashing)

import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { JWT_SECRET, TOKEN_LIFESPAN } from "@config";
import { redisClient } from "@database";
import { OfficerRole } from "@models/enums/OfficerRole";

const SALT_ROUNDS = 10;
const SESSION_PREFIX = "session:";
const BLACKLIST_PREFIX = "blacklist:";

export type SessionType = "web" | "telegram";

export type AuthTokenPayload = {
  id: number;
  username: string;
  isStaff?: boolean; // true per staff, false per utenti
  // supporta uno o più ruoli
  type: OfficerRole | OfficerRole[] | string | string[];
  sessionType?: SessionType;
  chatId?: number;
};

// hashPassword
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

// verifyPassword
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// creates a JWT token (supporta array di ruoli)
export function generateToken(payload: AuthTokenPayload): string {
  // normalizza type a array di stringhe per coerenza (facoltativo)
  const normalized = {
    ...payload,
    type: Array.isArray(payload.type) ? payload.type : [payload.type],
  };
  return jwt.sign(normalized, JWT_SECRET, { expiresIn: TOKEN_LIFESPAN });
}

// verifies a JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    throw new Error("Invalid or expired token");
  }
}

// Redis session management
export async function saveSession(
  userId: number,
  token: string,
  sessionType: SessionType = "web",
  chatId?: number,
  expiresIn: number = 86400
): Promise<void> {
  const key = `${SESSION_PREFIX}${userId}:${sessionType}`;
  // salva anche i ruoli (type) e isStaff nel record di sessione
  const decoded = verifyToken(token) as AuthTokenPayload & { exp?: number };
  const sessionData = JSON.stringify({
    token,
    sessionType,
    type: decoded.type, // array o singolo ruolo come presente nel token
    isStaff: decoded.isStaff, // boolean
    createdAt: Date.now(),
    chatId: chatId ?? decoded.chatId ?? 0
  });
  await redisClient.set(key, sessionData, { EX: expiresIn });
}

export async function getSession(
  userId: number,
  sessionType: SessionType
): Promise<{
  token: string;
  sessionType: SessionType;
  type?: AuthTokenPayload["type"];
  isStaff?: boolean;
  createdAt: number;
  chatId?: number;
} | null> {
  const key = `${SESSION_PREFIX}${userId}:${sessionType}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

export async function getTelegramChatId(
  userId: number
): Promise<number | null> {
  const session = await getSession(userId, "telegram");
  return session?.chatId ? session.chatId : null;
}

export async function deleteSession(
  userId: number,
  sessionType: SessionType
): Promise<void> {
  const key = `${SESSION_PREFIX}${userId}:${sessionType}`;
  await redisClient.del(key);
}

export async function validateSession(
  userId: number,
  token: string,
  sessionType: SessionType
): Promise<boolean> {
  const isBlacklisted = await isTokenBlacklisted(token);
  if (isBlacklisted) return false;
  const sessionData = await getSession(userId, sessionType);
  return sessionData !== null && sessionData.token === token;
}

// Blacklist management
export async function addToBlacklist(
  token: string,
  reason: string = "revoked"
): Promise<void> {
  const decoded = verifyToken(token) as { exp?: number };
  const key = `${BLACKLIST_PREFIX}${token}`;
  const ttl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 86400;
  if (ttl > 0) {
    await redisClient.set(key, JSON.stringify({ reason, blacklistedAt: Date.now() }), { EX: ttl });
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const key = `${BLACKLIST_PREFIX}${token}`;
  const result = await redisClient.get(key);
  return result !== null;
}

export async function blacklistUserSessions(
  userId: number,
  sessionType: SessionType,
  reason: string = "revoked"
): Promise<void> {
  const sessionData = await getSession(userId, sessionType);
  if (sessionData) {
    await addToBlacklist(sessionData.token, reason);
    await deleteSession(userId, sessionType);
  }
}

