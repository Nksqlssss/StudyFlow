export function createVerificationEmailHtml(token: string) {
	const frontendUrl = process.env.FRONTEND_URL

	if (!frontendUrl) {
		throw new Error('FRONTEND_URL is not configured')
	}

	const url = new URL('/verify-email', frontendUrl)

	url.searchParams.set('token', token)

	const verificationLink = url.toString()

	return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Verify your email — StudyFlow</title>
    </head>

    <body style="margin:0;padding:0;background-color:#0b1020;font-family:Arial,Helvetica,sans-serif;">
      <div style="display:none;font-size:1px;color:#0b1020;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
        One last step! Verify your email and get started with StudyFlow.
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1020;">
        <tr>
          <td align="center" style="padding:48px 16px;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#151b30;border:1px solid #2c3552;border-radius:20px;">

              <!-- Logo -->
              <tr>
                <td align="center" style="padding:40px 24px 28px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="width:42px;height:42px;background-color:#705cf6;border-radius:12px;color:#ffffff;font-size:24px;font-weight:bold;">
                        S
                      </td>
                      <td style="padding-left:12px;color:#ffffff;font-size:25px;font-weight:700;letter-spacing:-1px;">
                        Study<span style="color:#a99aff;">Flow</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Divider -->
              <tr>
                <td style="padding:0 32px;">
                  <div style="border-top:1px solid #2c3552;"></div>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td align="center" style="padding:44px 32px 16px;">

                  <p style="margin:0 0 16px;color:#a99aff;font-size:12px;font-weight:bold;letter-spacing:3px;">
                    ONE LAST STEP
                  </p>

                  <h1 style="margin:0 0 20px;color:#ffffff;font-size:32px;line-height:1.25;letter-spacing:-1px;">
                    Your journey<br />starts here.
                  </h1>

                  <p style="margin:0;color:#b7bed2;font-size:16px;line-height:1.8;">
                    Welcome to StudyFlow! You're just one click away
                    from a more organized, focused, and productive
                    study experience.
                  </p>

                </td>
              </tr>

              <!-- Button -->
              <tr>
                <td align="center" style="padding:32px 24px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" bgcolor="#715cf5" style="border-radius:10px;">
                        <a
                          href="${verificationLink}"
                          target="_blank"
                          style="display:inline-block;padding:17px 38px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;border-radius:10px;"
                        >
                          Verify my email &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Expiration -->
              <tr>
                <td align="center" style="padding:0 32px 36px;">
                  <p style="margin:0;color:#8792ad;font-size:13px;line-height:1.6;">
                    This verification link expires in
                    <strong style="color:#c4bbff;">30 minutes</strong>.
                  </p>
                </td>
              </tr>

              <!-- Fallback link -->
              <tr>
                <td style="padding:0 32px 36px;">
                  <div style="border-top:1px solid #2c3552;padding-top:24px;">
                    <p style="margin:0 0 12px;color:#aab3cb;font-size:13px;line-height:1.6;">
                      Button not working? Copy and paste this link into your browser:
                    </p>
                    <a href="${verificationLink}" style="color:#a99aff;font-size:12px;line-height:1.8;word-break:break-all;">
                      ${verificationLink}
                    </a>
                  </div>
                </td>
              </tr>

            </table>

            <!-- Footer -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
              <tr>
                <td align="center" style="padding:28px 20px;">
                  <p style="margin:0 0 10px;color:#aab3cb;font-size:13px;">
                    Plan smarter. Focus better. Achieve more.
                  </p>
                  <p style="margin:0;color:#65708b;font-size:12px;">
                    &copy; StudyFlow &middot; Made for ambitious minds.
                  </p>
                  <p style="margin:16px 0 0;color:#65708b;font-size:11px;line-height:1.6;">
                    If you didn't create a StudyFlow account,
                    you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </body>
  </html>
`
}
