// src/components/features/contact/ContactForm.tsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { httpsCallable, Functions } from 'firebase/functions';
import ServiceRegistry from '../../../services/firebase/core/ServiceRegistry';
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
 * Uses Firebase callable functions to send emails securely
 */
const ContactForm: React.FC<ContactFormProps> = ({ initialData = {} }) => {
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
    ...initialData
  });

  // Initialize Firebase Functions from existing service registry
  useEffect(() => {
    try {
      const registry = ServiceRegistry.getInstance();
      
      // Check if Firebase services are initialized
      if (registry.has('functions')) {
        setIsInitialized(true);
      } else {
        // If not initialized yet, wait a bit and try again
        const timeout = setTimeout(() => {
          if (registry.has('functions')) {
            setIsInitialized(true);
          } else {
            setSubmitError('Failed to initialize contact system. Please refresh the page.');
          }
        }, 1000);
        
        return () => clearTimeout(timeout);
      }
    } catch (error) {
      console.error('Failed to access Firebase Functions:', error);
      setSubmitError('Failed to initialize contact system. Please refresh the page.');
    }
  }, []);

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
   * Handle input changes for form fields
   * @param field - The form field to update
   * @returns Event handler function
   */
  const handleInputChange = (field: keyof ContactFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Clear any previous errors when user starts typing
    if (submitError) {
      setSubmitError(null);
    }
  };

  /**
   * Validate form data before submission
   * @returns Error message if validation fails, null if valid
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
    if (formData.message.trim().length < 10) {
      return 'Message must be at least 10 characters long';
    }
    return null;
  };

  /**
   * Submit the contact form using Firebase callable function
   * @param e - Form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    // Don't submit if Firebase Functions not initialized
    if (!isInitialized) {
      setSubmitError('Contact system not ready. Please try again in a moment.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Get the Firebase Functions instance from service registry
      const registry = ServiceRegistry.getInstance();
      const functions = registry.get('functions') as Functions;
      
      if (!functions) {
        throw new Error('Firebase Functions not available');
      }
      
      // Create callable function reference
      const sendContactEmail = httpsCallable(functions, 'sendContactEmail');
      
      // Prepare data for submission (remove empty subject if not provided)
      const submissionData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim() || undefined,
        message: formData.message.trim(),
      };

      // Call the Firebase function
      const result = await sendContactEmail(submissionData);
      
      // Check if the function returned success
      // result.data contains the response from the cloud function
      const response = result.data as { success: boolean; message: string };
      
      if (response && response.success) {
        // Success - reset form and show success message
        setSubmitSuccess(true);
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
      } else {
        throw new Error(response?.message || 'Unexpected response from server');
      }

    } catch (error: any) {
      let errorMessage = 'Failed to send message. Please try again.';
      
      // Handle Firebase Functions errors
      if (error.code) {
        switch (error.code) {
          case 'functions/invalid-argument':
            errorMessage = error.message || 'Please check your input and try again.';
            break;
          case 'functions/resource-exhausted':
            errorMessage = 'Too many requests. Please wait before trying again.';
            break;
          case 'functions/unauthenticated':
            errorMessage = 'Authentication required. Please refresh the page.';
            break;
          case 'functions/internal':
            errorMessage = 'Server error. Please try again later.';
            break;
          case 'functions/unavailable':
            errorMessage = 'Service temporarily unavailable. Please try again later.';
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSubmitError(errorMessage);
      console.error('Contact form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Reset form to allow sending another message
   */
  const handleSendAnother = () => {
    setSubmitSuccess(false);
    // Clear any URL parameters that might be set
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.has('subject')) {
      // Re-apply URL parameter pre-filling
      const prefilledSubject = urlParams.get('subject');
      if (prefilledSubject) {
        setFormData(prev => ({
          ...prev,
          subject: prefilledSubject,
          message: prefilledSubject.includes('Limit Increase') 
            ? 'Hello,\n\nI would like to request an increase to my smart detection usage limit.\n\n*************\nInsert reason for usage increase here\n*************\n\nPlease let me know if you need more information from me.\n\nThank you!'
            : ''
        }));
      }
    }
  };

  // Show success state after successful submission
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
        <Button onClick={handleSendAnother}>
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
      {/* Name input field */}
      <Input
        label="Name"
        value={formData.name}
        onChange={handleInputChange('name')}
        required
        disabled={isSubmitting || !isInitialized}
        placeholder="Your full name"
      />

      {/* Email input field */}
      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleInputChange('email')}
        required
        disabled={isSubmitting || !isInitialized}
        placeholder="your.email@example.com"
      />

      {/* Subject input field (optional) */}
      <Input
        label="Subject (optional)"
        value={formData.subject}
        onChange={handleInputChange('subject')}
        disabled={isSubmitting || !isInitialized}
        placeholder="Brief description of your inquiry"
      />

      {/* Message textarea field */}
      <Input
        label="Message"
        isTextArea
        rows={6}
        value={formData.message}
        onChange={handleInputChange('message')}
        required
        disabled={isSubmitting || !isInitialized}
        placeholder="Please describe your question, feedback, or issue in detail... (minimum 10 characters)"
      />

      {/* Error message display */}
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
        disabled={isSubmitting || !isInitialized}
        startIcon={isSubmitting ? undefined : <Send className="w-4 h-4" />}
        isLoading={isSubmitting}
      >
        {!isInitialized ? 'Initializing...' : isSubmitting ? 'Sending...' : 'Send Message'}
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