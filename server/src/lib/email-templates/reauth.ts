import type { ReauthPurpose } from '../../generated/prisma/client.js'

export function createReauthCodeHtml(code: string, purpose: ReauthPurpose) {
	if (!/^\d{6}$/.test(code)) throw new Error('Invalid verification code format')
	const action =
		purpose === 'set_password' ? 'set your first password' : 'change your email'
	return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Verify your identity - StudyFlow</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#152039;padding:24px;">
<h1>Verify your identity</h1><p>Use this code to ${action} in StudyFlow:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px;">${code}</p>
<p>This code expires in 10 minutes. Never share it with anyone.</p>
<p>If you did not request this action, ignore this email and review your account security.</p></body></html>`
}
