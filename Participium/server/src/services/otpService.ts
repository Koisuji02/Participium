import { redisClient } from "@database";
const APP_NS = "participium";
const DEFAULT_TTL_SEC = 30 * 60;

function keyFor(email: string): string {
  return `${APP_NS}:otp:email:${email}`;
}

export async function generateOtp(email: string, ttlSec: number = DEFAULT_TTL_SEC): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await redisClient.set(keyFor(email), code, { EX: ttlSec });
  return code;
}

export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const key = keyFor(email);
  const saved = await redisClient.get(key);
  const ok = saved != null && saved === code;
  if (ok) await redisClient.del(key); // one-time
  return ok;
}

export async function clearOtp(email: string) {
  await redisClient.del(keyFor(email));
}