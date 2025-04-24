// src/components/features/contact/ContactForm.tsx
import React, { useState } from 'react';
import Typography from '../../core/Typography';
import Input from '../../core/Input';
import Button from '../../core/Button';
import Card from '../../core/Card';
import { AlertCircle, Send, Check } from 'lucide-react';

// Adjust this URL to match your deployed Firebase function
const CONTACT_FUNCTION_URL = 'https://europe-west1-dnd-campaign-companion.cloudfunctions.net/sendContactEmail';

interface ContactFormProps {
  onSuccess?: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // Validate inputs
      if (!name.trim() || !email.trim() || !message.trim()) {
        throw new Error('Please fill in all required fields');
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Send to Firebase function
      const response = await fetch(CONTACT_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message. Please try again later.');
      }

      // Success!
      setSuccess(true);
      
      // Reset form
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header title="Contact Us" />
      <Card.Content>
        {success ? (
          <div className="text-center py-6">
            <div className="mb-4 mx-auto w-12 h-12 rounded-full flex items-center justify-center success-icon-bg">
              <Check size={24} className="success-icon" />
            </div>
            <Typography variant="h3" className="mb-2">
              Message Sent!
            </Typography>
            <Typography color="secondary" className="mb-4">
              Thank you for your message. We'll get back to you as soon as possible.
            </Typography>
            <Button onClick={() => setSuccess(false)}>
              Send Another Message
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Your Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />

            <Input
              label="Email Address *"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />

            <Input
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
            />

            <Input
              label="Message *"
              isTextArea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              required
            />

            {error && (
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="form-error" />
                <Typography color="error">{error}</Typography>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              isLoading={loading}
              startIcon={<Send size={16} />}
              className="w-full"
            >
              Send Message
            </Button>
          </form>
        )}
      </Card.Content>
    </Card>
  );
};

export default ContactForm;