import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.js'

type AccessTokenPayload = {
  userId: string;
};

const jwtExpiresIn = env.JWT_EXPIRES_IN as SignOptions['expiresIn'];

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: jwtExpiresIn
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}