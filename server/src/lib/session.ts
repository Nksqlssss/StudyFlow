import { createHmac } from 'node:crypto'
import { env } from '../config/env.js'

export function sessionHash(authorization: string) {
	return createHmac('sha256', env.JWT_SECRET)
		.update('studyflow:session:v1\0')
		.update(authorization.slice('Bearer '.length))
		.digest('hex')
}
