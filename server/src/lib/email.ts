import { Resend } from 'resend'
import { createVerificationEmailHtml } from './email-templates/verification.js'

const resend = new Resend(process.env.RESEND_API_KEY)

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
