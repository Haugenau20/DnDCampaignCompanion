// src/pages/ContactPage.tsx
import React from 'react';
import Typography from '../components/core/Typography';
import ContactForm from '../components/features/contact/ContactForm';
import { Mail, Clock, Bug, PlusCircle } from 'lucide-react';

const ContactPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Typography variant="h1" className="mb-6">
        Contact Us
      </Typography>
      <div>
          <Typography color="secondary" className="mb-6">
            Have questions about our D&D Campaign Companion? Want to report a bug or suggest a feature?
            We'd love to hear from you! Fill out the form below and we'll get back to you as soon as possible.
          </Typography>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">          
          <ContactForm />
        </div>

        <div className="space-y-6">

          <div>
            <div className="flex items-center gap-2">
              <Mail className="primary" />
              <Typography variant="h4">Email</Typography>
            </div>
            <Typography color="secondary">
              Our secure contact form ensures your privacy while connecting you directly with our team.
            </Typography>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Clock className="primary" />
              <Typography variant="h4">Response Time</Typography>
            </div>
            <Typography color="secondary">
              We aim to respond to all inquiries within 1-2 weeks.
            </Typography>
          </div>
        
          <div>
            <div className="flex items-center gap-2">
              <PlusCircle className="primary" />
              <Typography variant="h4">Feature Request</Typography>
            </div>
            <Typography color="secondary">
              Have an idea to make the Campaign Companion better? We'd love to hear it! Please describe the feature and how it would improve your user experience.
            </Typography>
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <Bug className="primary" />
              <Typography variant="h4">Bug</Typography>
            </div>
            <Typography color="secondary">
              Notice something not working quite right? We're eager to fix it! Tell us what happened, where it happened, and what you expected to see.
            </Typography>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ContactPage;