import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Fixed typo: smpt -> smtp
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'clydetadiwa8@gmail.com',
    pass: process.env.EMAIL_PASS
  },
  // Add additional configuration for reliability
  pool: true, // Use pooled connections
  maxConnections: 3, // Maximum number of connections to make
  maxMessages: 100, // Maximum number of messages to send using a connection
  rateDelta: 1000, // Define the time window for rate limiting (in ms)
  rateLimit: 5, // Maximum number of messages to send in rateDelta time window
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    // Verify connection configuration before sending
    await transporter.verify();

    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: '"Clyde Tadiwa" <clydetadiwa8@gmail.com>', // Fixed sender address
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Add specific error handling for common issues
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND')) {
        throw new Error('Failed to connect to email server. Please check your internet connection and server settings.');
      } else if (error.message.includes('EAUTH')) {
        throw new Error('Email authentication failed. Please check your credentials.');
      } else if (error.message.includes('ETIMEDOUT')) {
        throw new Error('Email server connection timed out. Please try again.');
      }
    }
    
    throw new Error('Failed to send email.');
  }
}

// Add a test function to verify email configuration
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}