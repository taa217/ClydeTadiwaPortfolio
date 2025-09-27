import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Resend } from 'resend';

// Create a transporter object optimized for serverless environments
const createTransporter = () => {
  const options: SMTPTransport.Options = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'clydetadiwa8@gmail.com',
      pass: process.env.EMAIL_PASS || ''
    },
    pool: false, // Disable pooling for serverless
    connectionTimeout: 45000,
    socketTimeout: 45000,
    greetingTimeout: 45000,
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    },
  };
  return nodemailer.createTransport(options);
};

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Check Gmail authentication setup
export async function checkGmailSetup(): Promise<{ isValid: boolean; message: string }> {
  const emailPass = process.env.EMAIL_PASS;
  
  if (!emailPass) {
    return {
      isValid: false,
      message: 'EMAIL_PASS environment variable is not set. Please add it to your Vercel environment variables.'
    };
  }
  
  if (emailPass.length < 16) {
    return {
      isValid: false,
      message: 'EMAIL_PASS appears to be a regular password. For Gmail SMTP, you need an "App Password". Please generate one at https://support.google.com/accounts/answer/185833'
    };
  }
  
  return {
    isValid: true,
    message: 'Gmail configuration appears correct.'
  };
}

// --- Resend setup ---
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function isResendConfigured(): boolean {
  return Boolean(resend);
}

async function sendEmailViaResend(options: EmailOptions): Promise<void> {
  if (!resend) {
    throw new Error('Resend client is not configured.');
  }

  const to = options.to;
  const subject = options.subject;
  const html = options.html;

  const result = await resend.emails.send({
    from: RESEND_FROM,
    to,
    subject,
    html
  });

  if ((result as any).error) {
    // The SDK returns { data, error }
    const err = (result as any).error;
    const message = typeof err === 'string' ? err : (err.message || 'Unknown Resend error');
    throw new Error(`Resend error: ${message}`);
  }
}

// Retry function for failed email sends
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${i + 1} failed:`, error instanceof Error ? error.message : error);
      
      if (i < maxRetries - 1) {
        // Wait before retrying, with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw (lastError ?? new Error('Operation failed after multiple retries'));
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  // Prefer Resend in serverless if configured; fallback to Gmail SMTP
  if (isResendConfigured()) {
    return retryOperation(async () => {
      console.log(`Sending via Resend to: ${options.to}`);
      await sendEmailViaResend(options);
    }, 5, 1000);
  }

  // Gmail fallback
  const setupCheck = await checkGmailSetup();
  if (!setupCheck.isValid) {
    console.error('Gmail setup issue:', setupCheck.message);
    throw new Error(setupCheck.message);
  }

  return retryOperation(async () => {
    const transporter = createTransporter();

    try {
      // Verify connection configuration before sending
      console.log('Verifying email connection...');
      await transporter.verify();
      console.log('Email connection verified successfully');

      // Send mail with defined transport object
      console.log(`Sending email to: ${options.to}`);
      const info = await transporter.sendMail({
        from: '"Clyde Tadiwa" <clydetadiwa8@gmail.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      console.log('Message sent successfully: %s', info.messageId);
      console.log('Email accepted for:', info.accepted);
      console.log('Email rejected for:', info.rejected);
    } catch (error) {
      console.error('Error in sendEmail (Gmail):', error);

      if (error instanceof Error) {
        if (error.message.includes('ENOTFOUND')) {
          throw new Error('Failed to connect to email server. DNS resolution failed.');
        } else if (error.message.includes('EAUTH')) {
          throw new Error('Email authentication failed. Please ensure you are using a Gmail App Password: https://support.google.com/accounts/answer/185833');
        } else if (error.message.includes('ETIMEDOUT')) {
          throw new Error('Email server connection timed out. Network issue detected.');
        } else if (error.message.includes('ESOCKET')) {
          throw new Error('Socket connection error. TLS handshake failed.');
        } else if (error.message.includes('ECONNREFUSED')) {
          throw new Error('Connection refused by email server.');
        }
      }

      throw error;
    } finally {
      transporter.close();
    }
  }, 3, 3000);
}

// Batch email sending with concurrency control and provider-aware throttling
export async function sendBatchEmails(emails: EmailOptions[]): Promise<void> {
  console.log(`Starting batch email send for ${emails.length} recipients`);

  // Dedupe recipients
  const seen = new Set<string>();
  const uniqueEmails = emails.filter(e => {
    const key = e.to.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const provider = isResendConfigured() ? 'resend' : 'gmail';
  const concurrency = provider === 'resend' ? 10 : 2; // Resend can handle more safely
  const perEmailDelayMs = provider === 'resend' ? 100 : 400; // small jitter to spread out

  let index = 0;
  let successCount = 0;
  let failureCount = 0;

  async function worker(workerId: number) {
    while (true) {
      const current = index++;
      if (current >= uniqueEmails.length) break;
      const email = uniqueEmails[current];
      try {
        await sendEmail(email);
        successCount++;
      } catch (err) {
        failureCount++;
        console.error(`[worker ${workerId}] Failed to send to ${email.to}:`, err);
      }
      // Throttle between sends per worker
      await new Promise(resolve => setTimeout(resolve, perEmailDelayMs));
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, uniqueEmails.length) }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  console.log(`Batch email sending completed. Success: ${successCount}, Failed: ${failureCount}`);
}

// Add a test function to verify email configuration
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    if (isResendConfigured()) {
      // Minimal ping using Resend API key presence
      console.log('Resend appears configured. Attempting dry-run validation by sending to self (skipped).');
      return true;
    }

    const setupCheck = await checkGmailSetup();
    if (!setupCheck.isValid) {
      console.error('Gmail setup check failed:', setupCheck.message);
      return false;
    }

    const transporter = createTransporter();
    await transporter.verify();
    transporter.close();
    console.log('Email configuration (Gmail) is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}

/*
 * IMPORTANT: For production use, consider switching to a more reliable email service:
 * 
 * 1. Resend (resend.com) - Modern, developer-friendly, excellent for serverless
 *    npm install resend
 *    const { Resend } = require('resend');
 *    const resend = new Resend(process.env.RESEND_API_KEY);
 * 
 * 2. SendGrid (sendgrid.com) - Reliable, scalable
 *    npm install @sendgrid/mail
 *    const sgMail = require('@sendgrid/mail');
 *    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
 * 
 * 3. AWS SES - If you're already using AWS
 *    npm install @aws-sdk/client-ses
 * 
 * Gmail SMTP often has reliability issues in serverless environments due to:
 * - Connection timeouts
 * - Rate limiting
 * - Authentication complexity
 * - Security restrictions
 */