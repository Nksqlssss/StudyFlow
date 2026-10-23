import { Resend } from 'resend'
import { createVerificationEmailHtml } from './email-templates/verification.js'
import { createEmailChangeHtml } from './email-templates/email-change.js'
import { createReauthCodeHtml } from './email-templates/reauth.js'
import type { ReauthPurpose } from '../generated/prisma/client.js'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendReauthCodeEmail(email: string, code: string, purpose: ReauthPurpose) {
	const { error } = await resend.emails.send({
		from: 'StudyFlow <onboarding@resend.dev>', to: email,
		subject: 'Your verification code - StudyFlow', html: createReauthCodeHtml(code, purpose)
	})
	if (error) throw new Error('Reauthentication email delivery failed')
}

export async function sendEmailChangeEmail(email: string, token: string) {
	const { error } = await resend.emails.send({
		from: 'StudyFlow <onboarding@resend.dev>',
		to: email,
		subject: 'Confirm your email change - StudyFlow',
		html: createEmailChangeHtml(token)
	})
	if (error) throw new Error('Email change delivery failed')
}

export async function sendVerificationEmail(email: string, token: string) {
	const message = createVerificationEmailHtml(token)

	const { error } = await resend.emails.send({
		from: 'StudyFlow <onboarding@resend.dev>',
		to: email,
		subject: 'Verify your email — StudyFlow',
		html: message
	})

	if (error) {
		throw new Error(error.message)
	}
}
