# User Management

## Overview

The User Management system enables users to create and manage personalized accounts within the D&D Campaign Companion. A key component is the username mapping system that associates friendly, unique usernames with Firebase Authentication accounts for better user experience and attribution across the application.

## User Stories

### Account Management

1. **User Registration**
   - As a new user, I want to create an account to access the application.
   - As a new user, I want to choose a unique username during registration.
   - As a new user, I want to see clear feedback if my chosen username is already taken.

2. **User Authentication**
   - As a returning user, I want to log in with my email and password.
   - As a user, I want to remain logged in between sessions until I explicitly log out.
   - As a user, I want to recover my password if I forget it.

3. **Profile Management**
   - As a user, I want to view my profile information.
   - As a user, I want to update my display name and other profile details.
   - As a user, I want to change my username while maintaining my account history.

### Username System

1. **Username Selection**
   - As a new user, I want to choose a unique username that represents me in the application.
   - As a user, I want my username to be displayed instead of my email address throughout the application.
   - As a user, I want to see clear username requirements during registration.

2. **Content Attribution**
   - As a user, I want my username to appear as the creator of content I add (NPCs, locations, rumors, etc.).
   - As a user, I want to see which user created or last modified content in the system.
   - As a user, I want to know which party member contributed specific content to our campaign.

3. **Collaboration**
   - As a user, I want to invite other users to collaborate on our campaign content.
   - As a user, I want to contribute to our shared campaign while maintaining my identity.
   - As a user, I want to recognize other party members by their consistent usernames.

## Functional Requirements

### Username Requirements

1. **Format and Validation**
   - Usernames must be 3-20 characters long
   - Allowed characters: alphanumeric, underscores, hyphens (no spaces)
   - Usernames must be case-insensitive (e.g., "Ranger" and "ranger" are considered the same)
   - System must validate username requirements in real-time during input
   - System must check username availability before completion of registration

2. **Uniqueness**
   - Each username must be unique across the entire application
   - Uniqueness check must be case-insensitive
   - System must prevent race conditions when multiple users attempt to claim the same username

3. **Display**
   - Usernames must be displayed consistently throughout the application
   - Usernames should maintain original capitalization for display
   - System must use usernames for content attribution rather than email addresses

### User Data Requirements

1. **Required User Data**
   - Email address (from Firebase Authentication)
   - Username (unique, user-selected)
   - Creation date
   - Last login date

2. **Optional User Data**
   - Theme preferences

3. **Security Requirements**
   - users must only be able to modify their own profile data
   - Username changes must verify uniqueness before committing
   - System must prevent username spoofing or impersonation

## Non-Functional Requirements

1. **Performance**
   - Username availability checks must complete within 1 second
   - Username-related operations must not impact overall system performance

2. **Scalability**
   - Username system must support dozens of users per campaign
   - Uniqueness checks must remain efficient as user base grows

3. **Security**
   - Username system must integrate securely with Firebase Authentication
   - System must prevent enumeration attacks on usernames
   - System must follow principle of least privilege for data access

4. **Usability**
   - Username selection must be intuitive and guided
   - Error messages for username validation must be clear and actionable
   - Username display must be consistent across mobile and desktop interfaces