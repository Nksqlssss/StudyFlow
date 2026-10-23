export function createEmailChangeHtml(token: string) {
	const frontendUrl = process.env.FRONTEND_URL
	if (!frontendUrl) throw new Error('FRONTEND_URL is not configured')
	const url = new URL('/app/profile', frontendUrl)
	url.hash = new URLSearchParams({ emailChangeToken: token }).toString()
	const link = url.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
	return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Confirm email change - StudyFlow</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#152039;padding:24px;">
<h1>Confirm your new email</h1>
<p>Confirm this address as your new StudyFlow email. Your current email remains unchanged until you confirm.</p>
<p><a href="${link}">Confirm email change</a></p>
<p>This link expires in 30 minutes. Sign in to the same StudyFlow account to confirm.</p>
<p>If you did not request this change, ignore this email.</p>
</body></html>`
}
