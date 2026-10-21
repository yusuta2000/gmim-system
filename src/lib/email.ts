import nodemailer from 'nodemailer'

const PORTAL_URL = 'https://itudfportal.vercel.app'

// Best-effort notification mail: a missing config or SMTP failure must never break the calling request.
export async function sendEmail(to: string | string[], subject: string, text: string) {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean)
  if (!user || !pass || recipients.length === 0) return

  try {
    await nodemailer.createTransport({ service: 'gmail', auth: { user, pass } }).sendMail({
      from: `İTÜ DF Ar.Gör Portalı <${user}>`,
      to: recipients,
      subject,
      text: `${text}\n\nPortal: ${PORTAL_URL}`,
    })
  } catch (error) {
    console.error('E-posta gönderilemedi:', error)
  }
}
