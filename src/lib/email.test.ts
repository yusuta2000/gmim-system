import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sendMail = vi.fn()
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({ sendMail })) } }))

import { sendEmail } from './email'

describe('sendEmail', () => {
  beforeEach(() => {
    sendMail.mockReset()
    vi.stubEnv('GMAIL_USER', 'portal@example.com')
    vi.stubEnv('GMAIL_APP_PASSWORD', 'test-app-password')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('sends to the given recipients with the portal link appended', async () => {
    await sendEmail(['a@example.com', ''], 'Konu', 'Mesaj')

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: ['a@example.com'],
      subject: 'Konu',
      text: expect.stringContaining('https://itudfportal.vercel.app'),
    }))
  })

  it('hides recipients from each other in bcc mode and logs the send', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    await sendEmail(['a@example.com', 'b@example.com'], 'Konu', 'Mesaj', { bcc: true })

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'portal@example.com',
      bcc: ['a@example.com', 'b@example.com'],
    }))
    expect(info).toHaveBeenCalledWith(expect.stringContaining('Konu'))
  })

  it('does nothing when mail credentials are not configured', async () => {
    vi.stubEnv('GMAIL_APP_PASSWORD', '')
    await sendEmail('a@example.com', 'Konu', 'Mesaj')
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('never throws when sending fails', async () => {
    sendMail.mockRejectedValue(new Error('smtp down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(sendEmail('a@example.com', 'Konu', 'Mesaj')).resolves.toBeUndefined()
  })
})
