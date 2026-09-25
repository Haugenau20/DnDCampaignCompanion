// functions/src/contact.ts
import * as functions from "firebase-functions/v2/https";
import nodemailer from "nodemailer";
import {rethrowHttpsError} from "./shared/httpsErrors";
import {imageBucket} from "./shared/imageBucket";

/**
 * The set of things a person can contact us about.
 *
 * Mirrors `src/shared/components/contact/contact-categories.ts`. This package
 * cannot import from `src/` -- it is a separate npm package with its own
 * tsconfig -- so the ids and subject labels are duplicated on purpose. The
 * design doc (section 4) is the single source of truth for both copies.
 */
const CATEGORY_SUBJECTS: Record<string, string> = {
  "broken": "Bug report",
  "feature": "Feature request",
  "smart-detection": "Smart detection limit increase",
  "account": "Account or group",
  "other": "General enquiry",
};

/**
 * Context the app attaches automatically so the sender does not have to
 * describe their setup.
 */
interface ContactContext {
  groupId?: string | null;
  campaignId?: string | null;
  route?: string | null;
  appVersion?: string | null;
}

/**
 * Interface for contact form submission data
 */
interface ContactFormData {
  name: string;
  email: string;
  /** The selected category id. Optional: an older client may not send one. */
  category?: string;
  /**
   * Free-text subject. Kept for compatibility with older clients, and still
   * sent by the current one as a fallback for older deployments of this
   * function. `category` wins when both are present.
   */
  subject?: string;
  message: string;
  /** The optional second field, currently only for smart-detection */
  reason?: string;
  context?: ContactContext;
  /**
   * Where the sender's screenshot was uploaded, from
   * `ImageStorageService.uploadScreenshot`. Signed-in senders only.
   */
  screenshotPath?: string;
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
 * Generate a short reference for one submission.
 *
 * Nothing is persisted: the reference exists so that a human can find the
 * thread again in an inbox, and so a follow-up message can point at the
 * first one. Four digits is enough for that and is short enough to quote.
 *
 * @returns A reference of the form CC-4192
 */
const generateReference = (): string => {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `CC-${digits}`;
};

/**
 * Work out what to call this submission in the email subject.
 *
 * Prefers the typed category, falls back to a free-text subject from an
 * older client, and finally to a generic label. The frontend deploys
 * separately from this function, so neither half may assume the other has
 * been updated.
 *
 * @param category - The category id, if the client sent one
 * @param subject - The free-text subject, if the client sent one
 * @returns A human-readable label for the subject line
 */
const composeSubjectLabel = (
  category: string | undefined,
  subject: string
): string => {
  if (category && CATEGORY_SUBJECTS[category]) {
    return CATEGORY_SUBJECTS[category];
  }
  if (subject) {
    return subject;
  }
  return "General enquiry";
};

/**
 * Render the automatically attached context as plain-text lines.
 *
 * @param context - The context the client attached, if any
 * @returns Zero or more `Label: value` lines
 */
const formatContextLines = (context: ContactContext | undefined): string[] => {
  if (!context) {
    return [];
  }
  const lines: string[] = [];
  if (context.groupId) lines.push(`Group: ${context.groupId}`);
  if (context.campaignId) lines.push(`Campaign: ${context.campaignId}`);
  if (context.route) lines.push(`Came from: ${context.route}`);
  if (context.appVersion) lines.push(`App version: ${context.appVersion}`);
  return lines;
};

/**
 * The name `ImageStorageService.uploadScreenshot` gives a screenshot, and the
 * only one `storage.rules.prod` accepts under `support/{uid}/`.
 */
const SCREENSHOT_NAME = /^[0-9a-f-]{36}\.(webp|jpg)$/;

/** What `prepareImage` produces, and so all a screenshot may be. */
const SCREENSHOT_TYPES = ["image/webp", "image/jpeg"];

/** The rules' size limit, checked again in case a file got past them. */
const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024;

/**
 * Check that a screenshot path, if one was sent, is one the caller uploaded.
 *
 * The path comes from the client, so without this anyone could have the
 * function mail them a file from someone else's folder -- or from anywhere
 * else in the bucket.
 *
 * @param {unknown} path - The `screenshotPath` the client sent
 * @param {string | undefined} uid - The caller, if signed in
 * @return {string | null} The path, or null when there is no screenshot
 */
const checkScreenshotPath = (
  path: unknown,
  uid: string | undefined
): string | null => {
  if (path === undefined || path === null || path === "") {
    return null;
  }
  if (typeof path !== "string") {
    throw new functions.HttpsError(
      "invalid-argument",
      "The screenshot could not be read. Please attach it again."
    );
  }
  if (!uid) {
    throw new functions.HttpsError(
      "unauthenticated",
      "Sign in to attach a screenshot."
    );
  }
  const folder = `support/${uid}/`;
  if (!path.startsWith(folder)) {
    throw new functions.HttpsError(
      "permission-denied",
      "You can only attach a screenshot you uploaded."
    );
  }
  if (!SCREENSHOT_NAME.test(path.slice(folder.length))) {
    throw new functions.HttpsError(
      "invalid-argument",
      "The screenshot could not be read. Please attach it again."
    );
  }
  return path;
};

/**
 * Read a screenshot from Storage, ready to attach to the email.
 *
 * @param {string} path - A path `checkScreenshotPath` accepted
 * @param {string} reference - The submission's reference, for the file name
 * @return {Promise<object>} A nodemailer attachment
 */
const loadScreenshot = async (path: string, reference: string) => {
  const file = imageBucket().file(path);
  let contentType: string;
  let size: number;
  try {
    const [metadata] = await file.getMetadata();
    contentType = String(metadata.contentType ?? "");
    size = Number(metadata.size);
  } catch (error) {
    if ((error as {code?: unknown}).code === 404) {
      // Never uploaded, already sent, or swept after a day.
      throw new functions.HttpsError(
        "not-found",
        "The screenshot is no longer there. Please attach it again."
      );
    }
    throw error;
  }
  const acceptable =
    SCREENSHOT_TYPES.includes(contentType) && size < MAX_SCREENSHOT_BYTES;
  if (!acceptable) {
    throw new functions.HttpsError(
      "invalid-argument",
      "The screenshot could not be read. Please attach it again."
    );
  }

  const [content] = await file.download();
  const extension = contentType === "image/webp" ? "webp" : "jpg";
  const filename = `screenshot-${reference}.${extension}`;
  return {filename, content, contentType};
};

/**
 * Delete a screenshot once its email has gone. Best effort: a file left
 * behind is only storage, and the daily sweep deletes it after a day.
 *
 * @param {string} path - The screenshot's path
 */
const deleteScreenshot = async (path: string): Promise<void> => {
  try {
    await imageBucket().file(path).delete({ignoreNotFound: true});
  } catch (error) {
    console.error(`Could not delete sent screenshot ${path}:`, error);
  }
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
      const {
        name, email, category, subject, message, reason, context,
        screenshotPath,
      } = request.data;

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
      const sanitizedReason = reason ? sanitizeText(reason) : "";

      // Additional validation after sanitization
      if (!sanitizedName || !sanitizedEmail || !sanitizedMessage) {
        throw new functions.HttpsError(
          "invalid-argument",
          "Invalid characters detected in form data."
        );
      }

      const screenshot = checkScreenshotPath(screenshotPath, request.auth?.uid);

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

      // Compose the subject from the typed category, so that the sender no
      // longer has to write one and so every email of a kind reads alike.
      const reference = generateReference();
      const subjectLabel = composeSubjectLabel(category, sanitizedSubject);
      const emailSubject =
        `[${reference}] D&D Campaign Companion: ${subjectLabel}`;
      const contextLines = formatContextLines(context);
      // Read after the rate limit, so a flood of calls can't each cost a
      // Storage download.
      const attachment = screenshot ?
        await loadScreenshot(screenshot, reference) :
        null;

      // Prepare email content with both text and HTML versions
      const mailOptions = {
        from: contactEmail,
        to: contactEmail, // Send to yourself
        replyTo: sanitizedEmail, // Allow replying directly to the sender
        subject: emailSubject,
        text: `
Contact Form Submission

Reference: ${reference}
Category: ${subjectLabel}
Name: ${sanitizedName}
Email: ${sanitizedEmail}

Message:
${sanitizedMessage}
${sanitizedReason ? `\nWhy they need more:\n${sanitizedReason}\n` : ""}
${contextLines.length ? `\nAttached context:\n${contextLines.join("\n")}\n` : ""}
${attachment ? `\nScreenshot: attached (${attachment.filename})\n` : ""}
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
    <p><strong>Reference:</strong> ${reference}</p>
    <p><strong>Category:</strong> ${subjectLabel}</p>
    <p><strong>From:</strong> ${sanitizedName}</p>
    <p><strong>Email:</strong> <a href="mailto:${sanitizedEmail}">${sanitizedEmail}</a></p>
  </div>

  <div style="margin: 20px 0;">
    <h3 style="color: #333;">Message:</h3>
    <div style="background: white; padding: 15px; border-left: 4px solid #4f46e5; margin: 10px 0;">
      ${sanitizedMessage.replace(/\n/g, "<br>")}
    </div>
  </div>
  ${sanitizedReason ? `
  <div style="margin: 20px 0;">
    <h3 style="color: #333;">Why they need more:</h3>
    <div style="background: white; padding: 15px; border-left: 4px solid #4f46e5; margin: 10px 0;">
      ${sanitizedReason.replace(/\n/g, "<br>")}
    </div>
  </div>` : ""}
  ${contextLines.length ? `
  <div style="margin: 20px 0;">
    <h3 style="color: #333;">Attached context:</h3>
    <p style="color: #6b7280; font-size: 13px;">${contextLines.join("<br>")}</p>
  </div>` : ""}
  ${attachment ? `
  <div style="margin: 20px 0;">
    <h3 style="color: #333;">Screenshot:</h3>
    <p style="color: #6b7280; font-size: 13px;">
      Attached (${attachment.filename})
    </p>
  </div>` : ""}

  <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
  <p style="color: #6b7280; font-size: 12px;">
    Sent via D&D Campaign Companion Contact Form<br>
    User ID: ${userId}<br>
    Timestamp: ${new Date().toISOString()}
  </p>
</div>
        `,
        attachments: attachment ? [attachment] : [],
      };

      // Send email using nodemailer
      await transporter.sendMail(mailOptions);

      // Only once the email has gone: if sending failed, the file stays, so
      // the sender can try again with the same screenshot.
      if (screenshot) {
        await deleteScreenshot(screenshot);
      }

      // Log successful submission for monitoring
      console.log(
        `Contact form email sent (${reference}) from ${sanitizedEmail} (${userId})`
      );

      // Return success response
      return {
        success: true,
        message: "Email sent successfully! We'll get back to you soon.",
        reference,
      };

    } catch (error) {
      // Log error for debugging
      console.error("Error in sendContactEmail function:", error);

      // Re-throw HttpsErrors as-is; wrap anything else (e.g. nodemailer
      // failures) as an internal error.
      rethrowHttpsError(
        error,
        "Failed to send email. Please try again later."
      );
    }
  }
);
