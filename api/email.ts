import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';

// Create a transporter object optimized for serverless environments
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'clydetadiwa8@gmail.com',
      pass: process.env.EMAIL_PASS
    },
    // Optimized for serverless environments
    pool: false, // Disable pooling for serverless
    maxConnections: 1, // Single connection
    maxMessages: 1, // One message per connection
    connectionTimeout: 45000, // Increased to 45 seconds
    socketTimeout: 45000, // Increased to 45 seconds
    greetingTimeout: 45000, // Increased to 45 seconds
    // Add TLS options for better compatibility
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates if needed
      ciphers: 'SSLv3',
    },
    // Add debug mode (remove in production)
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development',
  });
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

// Retry function for failed email sends
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
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
  
  throw lastError;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  // Check Gmail setup first
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
      console.error('Error in sendEmail:', error);
      
      // Add specific error handling for common issues
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
      // Close the transporter connection
      transporter.close();
    }
  }, 3, 3000); // Retry up to 3 times with 3 second initial delay
}

// Batch email sending function to avoid overwhelming the SMTP server
export async function sendBatchEmails(emails: EmailOptions[]): Promise<void> {
  console.log(`Starting batch email send for ${emails.length} recipients`);
  
  // Send emails in batches with delays to avoid rate limiting
  const batchSize = 3; // Reduced to 3 emails at a time for better reliability
  const delayBetweenBatches = 2000; // 2 second delay between batches
  
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    console.log(`Sending batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(emails.length / batchSize)}`);
    
    // Send batch sequentially instead of parallel to reduce load
    for (const email of batch) {
      try {
        await sendEmail(email);
        console.log(`Successfully sent email to: ${email.to}`);
        // Small delay between individual emails
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to send email to ${email.to}:`, error);
        // Continue with other emails even if one fails
      }
    }
    
    // Delay between batches (except for the last batch)
    if (i + batchSize < emails.length) {
      console.log(`Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  console.log('Batch email sending completed');
}

// Add a test function to verify email configuration
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    const setupCheck = await checkGmailSetup();
    if (!setupCheck.isValid) {
      console.error('Gmail setup check failed:', setupCheck.message);
      return false;
    }
    
    const transporter = createTransporter();
    await transporter.verify();
    transporter.close();
    console.log('Email configuration is valid');
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