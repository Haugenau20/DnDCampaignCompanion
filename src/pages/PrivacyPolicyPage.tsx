import React from 'react';
import Typography from '../components/core/Typography';
import Card from '../components/core/Card';
import Button from '../components/core/Button';
import { Shield, Clock, Database, UserCheck, Lock, ScrollText, Mail, ExternalLink } from 'lucide-react';
import { 
  INACTIVITY_TIMEOUT_TEXT, 
  REMEMBER_ME_TEXT 
} from '../constants/time';
import { useNavigation } from '../hooks/useNavigation';
import clsx from 'clsx';
import { useTheme } from '../context/ThemeContext';

/**
 * Privacy Policy page component
 */
const PrivacyPolicyPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { theme } = useTheme();
  const themePrefix = theme.name;

  const handleContactClick = () => {
    navigateToPage('/contact');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Typography variant="h1" className="mb-6">Privacy Policy</Typography>
      
      <Typography color="secondary" className="mb-8">
        Last updated: {new Date().toLocaleDateString('en-uk', { year: 'numeric', month: 'long', day: 'numeric' })}
      </Typography>
      
      <Card className="mb-8">
        <Card.Content>
          <div className="flex items-start gap-3 mb-4">
            <ScrollText className={clsx("mt-1", `${themePrefix}-primary`)} />
            <Typography variant="h3">Overview</Typography>
          </div>
          <Typography className="mb-4">
            This Privacy Policy explains how D&D Campaign Companion ("we", "us", or "our") collects, uses, and protects 
            your information when you use our application. We value your privacy and are committed to 
            protecting your personal data.
          </Typography>
          <Typography>
            By using the D&D Campaign Companion, you consent to the data practices described in this policy.
          </Typography>
        </Card.Content>
      </Card>
      
      <Typography variant="h2" className="mb-4">Information We Collect</Typography>
      
      <Card className="mb-6">
        <Card.Content>
          <div className="flex items-start gap-3 mb-4">
            <UserCheck className={clsx("mt-1", `${themePrefix}-primary`)} />
            <Typography variant="h3">Account Information</Typography>
          </div>
          <Typography className="mb-2">When you create an account, we collect:</Typography>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <Typography>Email address (for authentication)</Typography>
            </li>
            <li>
              <Typography>Username (for display and identification within the application)</Typography>
            </li>
            <li>
              <Typography>Account creation date</Typography>
            </li>
          </ul>
          <Typography>
            We use this information to create and maintain your account, identify you within the application, 
            and provide our services to you.
          </Typography>
        </Card.Content>
      </Card>
      
      <Card className="mb-6">
        <Card.Content>
          <div className="flex items-start gap-3 mb-4">
            <Mail className={clsx("mt-1", `${themePrefix}-primary`)} />
            <Typography variant="h3">Contact Form Information</Typography>
          </div>
          <Typography className="mb-2">
            When you submit information through our contact form, we collect:
          </Typography>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <Typography>Your name</Typography>
            </li>
            <li>
              <Typography>Email address</Typography>
            </li>
            <li>
              <Typography>Subject of your message (if provided)</Typography>
            </li>
            <li>
              <Typography>Content of your message</Typography>
            </li>
          </ul>
          <Typography className="mb-2">
            This information is processed to:
          </Typography>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <Typography>Respond to your inquiries or feedback</Typography>
            </li>
            <li>
              <Typography>Provide customer support</Typography>
            </li>
            <li>
              <Typography>Process and address your suggestions or concerns</Typography>
            </li>
          </ul>
          <Typography>
            When you submit a contact form, your information is sent through a secure cloud function to our 
            email address. We retain this information only as long as necessary to address your inquiry.
          </Typography>
        </Card.Content>
      </Card>
      
      <Card className="mb-6">
        <Card.Content>
          <div className="flex items-start gap-3 mb-4">
            <Clock className={clsx("mt-1", `${themePrefix}-primary`)} />
            <Typography variant="h3">Session Information</Typography>
          </div>
          <Typography className="mb-2">
            To maintain your login state and provide security, we collect and store:
          </Typography>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <Typography>Login timestamps (date and time of sign-in)</Typography>
            </li>
            <li>
              <Typography>Session activity information (to extend your session)</Typography>
            </li>
            <li>
              <Typography>Session preferences (such as "Remember me" settings)</Typography>
            </li>
          </ul>
          <Typography className="mb-4">
            We track session activity to extend your session while you're using the application. 
            Your session will expire after {INACTIVITY_TIMEOUT_TEXT} of inactivity, or after {REMEMBER_ME_TEXT} if 
            "Remember me" is enabled.
          </Typography>
          <Typography>
            We do not track specific actions you take within the application or collect browsing history. 
            We only detect activity to maintain your login state.
          </Typography>
        </Card.Content>
      </Card>
      
      <Card className="mb-8">
        <Card.Content>
          <div className="flex items-start gap-3 mb-4">
            <Database className={clsx("mt-1", `${themePrefix}-primary`)} />
            <Typography variant="h3">Campaign Content</Typography>
          </div>
          <Typography className="mb-2">
            When you use our application to manage your campaign, we store:
          </Typography>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <Typography>Content you create (NPCs, locations, rumors, etc.)</Typography>
            </li>
            <li>
              <Typography>Associations between your user account and your content</Typography>
            </li>
            <li>
              <Typography>Metadata about content creation and modification</Typography>
            </li>
          </ul>
          <Typography>
            This information is stored to provide the core functionality of our application and is associated 
            with your account to enable proper access control and attribution.
          </Typography>
        </Card.Content>
      </Card>
      
      <Typography variant="h2" className="mb-4">How We Use Your Information</Typography>
      
      <Card className="mb-8">
        <Card.Content>
          <Typography className="mb-4">We use the information we collect to:</Typography>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <Typography>Provide, maintain, and improve our application</Typography>
            </li>
            <li>
              <Typography>Create and maintain your user account</Typography>
            </li>
            <li>
              <Typography>Ensure secure authentication and authorization</Typography>
            </li>
            <li>
              <Typography>Maintain appropriate session management</Typography>
            </li>
            <li>
              <Typography>Associate your campaign content with your account</Typography>
            </li>
            <li>
              <Typography>Respond to your inquiries and provide support</Typography>
            </li>
            <li>
              <Typography>Identify and resolve technical issues</Typography>
            </li>
            <li>
              <Typography>Protect against unauthorized access to user accounts</Typography>
            </li>
          </ul>
        </Card.Content>
      </Card>
      
      <Typography variant="h2" className="mb-4">Data Storage and Security</Typography>
      
      <Card className="mb-8">
        <Card.Content>
          <div className="flex items-start gap-3 mb-4">
            <Lock className={clsx("mt-1", `${themePrefix}-primary`)} />
            <Typography variant="h3">How We Protect Your Data</Typography>
          </div>
          <Typography className="mb-4">
            We use Firebase, a Google Cloud service, to store and manage your data securely. We implement 
            industry-standard security measures to protect your personal information from unauthorized access, 
            alteration, disclosure, or destruction.
          </Typography>
          <Typography className="mb-2">Our security measures include:</Typography>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>
              <Typography>Secure authentication through Firebase Authentication</Typography>
            </li>
            <li>
              <Typography>Data encryption in transit and at rest</Typography>
            </li>
            <li>
              <Typography>Access controls and authorization rules</Typography>
            </li>
            <li>
              <Typography>Automatic session timeouts for inactive users</Typography>
            </li>
            <li>
              <Typography>Secure processing of contact form submissions</Typography>
            </li>
            <li>
              <Typography>Regular security assessments</Typography>
            </li>
          </ul>
          <Typography>
            While we implement safeguards to protect your information, no internet-based service can 
            guarantee 100% security. We strive to use commercially acceptable means to protect your 
            personal information.
          </Typography>
        </Card.Content>
      </Card>
      
      <Typography variant="h2" className="mb-4">Data Retention</Typography>
      
      <Card className="mb-8">
        <Card.Content>
          <Typography className="mb-4">
            We retain your account information and campaign content for as long as your account is active
            or as needed to provide you with our services.
          </Typography>
          <Typography className="mb-4">
            For contact form submissions, we retain the information only as long as necessary to respond to
            and resolve your inquiry. We do not use this information for marketing purposes.
          </Typography>
          <Typography>
            If you wish to delete your account, you can contact us to request account deletion.
            When an account is deleted, we will remove all personal information associated with that account
            while preserving campaign data for other users' reference where appropriate.
          </Typography>
        </Card.Content>
      </Card>
      
      <Typography variant="h2" className="mb-4">Your Rights</Typography>
      
      <Card className="mb-8">
        <Card.Content>
          <Typography className="mb-4">Depending on your location, you may have the right to:</Typography>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <Typography>Access the personal information we hold about you</Typography>
            </li>
            <li>
              <Typography>Request correction of inaccurate information</Typography>
            </li>
            <li>
              <Typography>Request deletion of your personal information</Typography>
            </li>
            <li>
              <Typography>Object to our processing of your information</Typography>
            </li>
            <li>
              <Typography>Request restriction of processing</Typography>
            </li>
            <li>
              <Typography>Request transfer of your information</Typography>
            </li>
          </ul>
        </Card.Content>
      </Card>
      
      <Typography variant="h2" className="mb-4">Changes to This Policy</Typography>
      
      <Card className="mb-8">
        <Card.Content>
          <Typography>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
            the new Privacy Policy on this page and updating the "Last updated" date. You are advised to 
            review this Privacy Policy periodically for any changes.
          </Typography>
        </Card.Content>
      </Card>
      
      <Typography variant="h2" className="mb-4">Contact Us</Typography>
      
      <Card className="mb-8">
        <Card.Content>
          <Typography className="mb-4">
            If you have any questions about this Privacy Policy or our data practices, please contact us 
            through our contact form.
          </Typography>
          
          <Button 
            onClick={handleContactClick}
            startIcon={<Mail />}
            className="mt-2"
          >
            Contact Us
          </Button>
        </Card.Content>
      </Card>
    </div>
  );
};

export default PrivacyPolicyPage;