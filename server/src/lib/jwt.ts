import jwt, { type SignOptions, type JwtPayload } from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { env } from '../config/env.js'

type AccessTokenPayload = {
  userId: string;
};

const jwtExpiresIn = env.JWT_EXPIRES_IN as SignOptions['expiresIn'];

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: jwtExpiresIn,
    jwtid: randomUUID()
  });
}

export function verifyAccessToken(token: string) {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload === 'string' || typeof payload.userId !== 'string' ||
      typeof payload.exp !== 'number' || !Number.isSafeInteger(payload.exp)) {
    throw new Error('Invalid access token');
  }
  return payload as AccessTokenPayload & JwtPayload & { exp: number };
}
