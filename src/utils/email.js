/**
 * Minimal email helper: in development it logs the email to stdout.
 * Replace with Nodemailer/SES integration in production.
 */
export async function sendEmail({ to, subject, text, html }) {
  // eslint-disable-next-line no-console
  console.log('[email] to:%s subject:%s\n%s', to, subject, html || text || '');
}

