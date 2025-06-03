// src/components/features/contact/ContactForm.tsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Typography from '../../core/Typography';
import Input from '../../core/Input';
import Button from '../../core/Button';
import { Send, Check, AlertCircle } from 'lucide-react';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface ContactFormProps {
  /** Optional initial data for the form */
  initialData?: Partial<ContactFormData>;
}

/**
 * Contact form component with support for URL parameter pre-filling
 * Handles subject pre-filling for usage limit increase requests
 */
const ContactForm: React.FC<ContactFormProps> = ({ initialData = {} }) => {
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
    ...initialData
  });

  // Handle URL parameters for pre-filling
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const prefilledSubject = urlParams.get('subject');
    
    if (prefilledSubject) {
      setFormData(prev => ({
        ...prev,
        subject: prefilledSubject,
        // Pre-fill message for limit increase requests
        message: prefilledSubject.includes('Limit Increase') 
          ? 'Hello,\n\nI would like to request an increase to my smart detection usage limit.\n\n*************\nInsert reason for usage increase here\n*************\n\nPlease let me know if you need more information from me.\n\nThank you!'
          : prev.message
      }));
    }
  }, [location.search]);

  /**
   * Handle input changes
   */
  const handleInputChange = (field: keyof ContactFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Clear any previous errors
    if (submitError) {
      setSubmitError(null);
    }
  };

  /**
   * Validate form data
   */
  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Name is required';
    }
    if (!formData.email.trim()) {
      return 'Email is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Please enter a valid email address';
    }
    if (!formData.message.trim()) {
      return 'Message is required';
    }
    return null;
  };

  /**
   * Submit the contact form
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Call your contact form submission endpoint
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Success
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });

    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success state
  if (submitSuccess) {
    return (
      <div className="text-center py-6">
        <div className="mb-4 mx-auto w-12 h-12 rounded-full flex items-center justify-center success-icon-bg">
          <Check size={24} className="success-icon" />
        </div>
        <Typography variant="h3" className="mb-2">
          Message Sent!
        </Typography>
        <Typography color="secondary" className="mb-4">
          Thank you for contacting us. We'll get back to you as soon as possible.
        </Typography>
        <Button onClick={() => setSubmitSuccess(false)}>
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
      {/* Form fields */}
      <Input
        label="Name"
        value={formData.name}
        onChange={handleInputChange('name')}
        required
        disabled={isSubmitting}
      />

      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleInputChange('email')}
        required
        disabled={isSubmitting}
      />

      <Input
        label="Subject (optional)"
        value={formData.subject}
        onChange={handleInputChange('subject')}
        disabled={isSubmitting}
      />

      <Input
        label="Message"
        isTextArea
        rows={6}
        value={formData.message}
        onChange={handleInputChange('message')}
        required
        disabled={isSubmitting}
      />

      {/* Error display */}
      {submitError && (
        <div className="flex items-center gap-2 p-3 rounded error-container">
          <AlertCircle className="w-4 h-4 status-failed" />
          <Typography variant="body-sm" color="error">
            {submitError}
          </Typography>
        </div>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={isSubmitting}
        startIcon={isSubmitting ? undefined : <Send className="w-4 h-4" />}
        isLoading={isSubmitting}
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </Button>

      {/* Help text for limit increase requests */}
      {formData.subject.includes('Limit Increase') && (
        <div className="p-3 rounded info-container">
          <Typography variant="body-sm" color="secondary">
            <strong>Tip:</strong> Include details about your D&D campaign and how you use the smart detection feature to help us process your request better.
          </Typography>
        </div>
      )}
    </form>
  );
};

export default ContactForm;