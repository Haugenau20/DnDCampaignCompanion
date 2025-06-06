// functions/src/contact.ts
import * as functions from "firebase-functions/v2/https";
import nodemailer from "nodemailer";

/**
 * Interface for contact form submission data
 */
interface ContactFormData {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

// Your personal campaign email will be set as an environment variable
const contactEmail = process.env.CONTACT_EMAIL || "";
const emailPassword = process.env.CONTACT_PASSWORD || "";

/**
 * Create a transport for nodemailer using Gmail service
 */
const transporter = nodemailer.createTransport({
  service: "gmail", // You can use other services like SendGrid, Mailgun, etc.
  auth: {
    user: contactEmail,
    pass: emailPassword,
  },
});

/**
 * Rate limiting setup to prevent spam
 * Note: For callable functions, we'll use user ID for rate limiting instead of IP
 */
const userThrottling: Record<string, { count: number, lastReset: number }> = {};
const MAX_REQUESTS_PER_HOUR = 5;
const ONE_HOUR_MS = 3600000;

/**
 * Check if user has exceeded rate limit
 * @param userId - The authenticated user's ID, or "anonymous" for unauthenticated users
 * @returns true if rate limit exceeded, false otherwise
 */
const isRateLimited = (userId: string): boolean => {
  const now = Date.now();

  if (!userThrottling[userId]) {
    userThrottling[userId] = {count: 0, lastReset: now};
  }

  // Reset counter if an hour has passed
  if (now - userThrottling[userId].lastReset > ONE_HOUR_MS) {
    userThrottling[userId] = {count: 0, lastReset: now};
  }

  // Check if rate limit is exceeded
  if (userThrottling[userId].count >= MAX_REQUESTS_PER_HOUR) {
    return true;
  }

  // Increment the request counter
  userThrottling[userId].count++;
  return false;
};

/**
 * Validate email format using regex
 * @param email - Email address to validate
 * @returns true if valid email format, false otherwise
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize text content to prevent XSS and ensure safe display
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
const sanitizeText = (text: string): string => {
  return text.trim().replace(/[<>]/g, "");
};

/**
 * Cloud function to handle contact form submissions using callable function pattern
 * This function sends emails via nodemailer and includes rate limiting protection
 */
export const sendContactEmail = functions.onCall(
  {
    region: "europe-west1",
    secrets: ["CONTACT_EMAIL", "CONTACT_PASSWORD"],
  },
  async (request: functions.CallableRequest<ContactFormData>) => {
    try {
      // Extract data from request
      const {name, email, subject, message} = request.data;

      // Validate required fields
      if (!name || !email || !message) {
        throw new functions.HttpsError(
          "invalid-argument",
          "Missing required fields. Please provide name, email, and message."
        );
      }

      // Validate email format
      if (!isValidEmail(email)) {
        throw new functions.HttpsError(
          "invalid-argument",
          "Please enter a valid email address."
        );
      }

      // Sanitize input data
      const sanitizedName = sanitizeText(name);
      const sanitizedEmail = sanitizeText(email);
      const sanitizedSubject = subject ? sanitizeText(subject) : "";
      const sanitizedMessage = sanitizeText(message);

      // Additional validation after sanitization
      if (!sanitizedName || !sanitizedEmail || !sanitizedMessage) {
        throw new functions.HttpsError(
          "invalid-argument",
          "Invalid characters detected in form data."
        );
      }

      // Determine user ID for rate limiting
      // Use authenticated user ID if available, otherwise use email as identifier
      const userId = request.auth?.uid || `anonymous_${sanitizedEmail}`;

      // Check rate limiting
      if (isRateLimited(userId)) {
        throw new functions.HttpsError(
          "resource-exhausted",
          "Too many requests. Please try again later."
        );
      }

      // Prepare email subject with proper formatting
      const emailSubject = sanitizedSubject
        ? `D&D Campaign Contact: ${sanitizedSubject}`
        : "D&D Campaign Contact Form";

      // Prepare email content with both text and HTML versions
      const mailOptions = {
        from: contactEmail,
        to: contactEmail, // Send to yourself
        replyTo: sanitizedEmail, // Allow replying directly to the sender
        subject: emailSubject,
        text: `
Contact Form Submission

Name: ${sanitizedName}
Email: ${sanitizedEmail}
${sanitizedSubject ? `Subject: ${sanitizedSubject}` : ""}

Message:
${sanitizedMessage}

---
Sent via D&D Campaign Companion Contact Form
User ID: ${userId}
Timestamp: ${new Date().toISOString()}
        `,
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">
    New Contact Form Submission
  </h2>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>From:</strong> ${sanitizedName}</p>
    <p><strong>Email:</strong> <a href="mailto:${sanitizedEmail}">${sanitizedEmail}</a></p>
    ${sanitizedSubject ? `<p><strong>Subject:</strong> ${sanitizedSubject}</p>` : ""}
  </div>
  
  <div style="margin: 20px 0;">
    <h3 style="color: #333;">Message:</h3>
    <div style="background: white; padding: 15px; border-left: 4px solid #4f46e5; margin: 10px 0;">
      ${sanitizedMessage.replace(/\n/g, "<br>")}
    </div>
  </div>
  
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
  <p style="color: #6b7280; font-size: 12px;">
    Sent via D&D Campaign Companion Contact Form<br>
    User ID: ${userId}<br>
    Timestamp: ${new Date().toISOString()}
  </p>
</div>
        `,
      };

      // Send email using nodemailer
      await transporter.sendMail(mailOptions);

      // Log successful submission for monitoring
      console.log(`Contact form email sent successfully from ${sanitizedEmail} (${userId})`);

      // Return success response
      return {
        success: true,
        message: "Email sent successfully! We'll get back to you soon.",
      };

    } catch (error) {
      // Log error for debugging
      console.error("Error in sendContactEmail function:", error);

      // Re-throw HttpsErrors as-is
      if (error instanceof functions.HttpsError) {
        throw error;
      }

      // Handle nodemailer or other unexpected errors
      throw new functions.HttpsError(
        "internal",
        "Failed to send email. Please try again later."
      );
    }
  }
);