// functions/src/contact.ts
import * as functions from "firebase-functions/v2/https";
import cors from "cors";
import nodemailer from "nodemailer";

// Configure CORS middleware
const corsHandler = cors({origin: true});

// Your personal campaign email will be set as an environment variable

const contactEmail = process.env.CONTACT_EMAIL || "";
const emailPassword = process.env.CONTACT_PASSWORD || "";

// Create a transport for nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail", // You can use other services like SendGrid, Mailgun, etc.
  auth: {
    user: contactEmail,
    pass: emailPassword,
  },
});

// Rate limiting setup
const ipThrottling: Record<string, { count: number, lastReset: number }> = {};
const MAX_REQUESTS_PER_HOUR = 5;
const ONE_HOUR_MS = 3600000;

// Convert potential array of IPs to a single string
const getClientIp = (req: functions.Request): string => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    // If it"s an array, take the first element, else split and take first IP
    const ips = Array.isArray(forwardedFor) ?
      forwardedFor[0] :
      forwardedFor.split(",")[0].trim();
    return ips || "unknown";
  }
  return req.ip || "unknown";
};

// Cloud function to handle contact form submissions - using v2 syntax
export const sendContactEmail = functions.onRequest(
  {
    region: "europe-west1",
    secrets: ["CONTACT_EMAIL", "CONTACT_PASSWORD"],
  },
  (req, res) => {
    return corsHandler(req, res, async () => {
      try {
        // Check request method
        if (req.method !== "POST") {
          return res.status(405).json({error: "Method Not Allowed"});
        }

        // Implement rate limiting based on IP address
        const ip = getClientIp(req);
        const now = Date.now();

        if (!ipThrottling[ip]) {
          ipThrottling[ip] = {count: 0, lastReset: now};
        }

        // Reset counter if an hour has passed
        if (now - ipThrottling[ip].lastReset > ONE_HOUR_MS) {
          ipThrottling[ip] = {count: 0, lastReset: now};
        }

        // Check if rate limit is exceeded
        if (ipThrottling[ip].count >= MAX_REQUESTS_PER_HOUR) {
          return res.status(429).json({
            error: "Too many requests. Please try again later.",
          });
        }

        // Increment the request counter
        ipThrottling[ip].count++;

        // Validate request body
        const {name, email, subject, message} = req.body;

        if (!name || !email || !message) {
          return res.status(400).json({
            error: "Missing required fields. Include name, email, and message.",
          });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({error: "Invalid email format"});
        }

        // Prepare email subject
        const emailSubject = subject ?
          `D&D Campaign Contact: ${subject}` :
          "D&D Campaign Contact Form";

        // Prepare email
        const mailOptions = {
          from: contactEmail,
          to: contactEmail, // Send to yourself
          replyTo: email, // Allow replying directly to the sender
          subject: emailSubject,
          text: `
Name: ${name}
Email: ${email}
Message:

${message}
          `,
          html: `
<div>
  <h2>New Contact Form Submission</h2>
  <p><strong>From:</strong> ${name}</p>
  <p><strong>Email:</strong> ${email}</p>
  <p><strong>Message:</strong></p>
  <p>${message.replace(/\n/g, "<br>")}</p>
</div>
          `,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        // Send success response
        return res.status(200).json({
          success: true,
          message: "Email sent successfully",
        });
      } catch (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({
          error: "Failed to send email. Please try again later.",
        });
      }
    });
  }
);
