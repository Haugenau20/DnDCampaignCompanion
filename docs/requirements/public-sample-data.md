# Public Data Feature

## Overview

The Public Data feature aims to provide a meaningful and engaging experience for unauthenticated users visiting the D&D Campaign Companion. Instead of showing "missing or insufficient permission" errors, the application will display carefully curated sample data that demonstrates the app's functionality and encourages user registration. This approach maintains security while improving the user experience for first-time visitors.

## User Stories

### For Visitors

1. **Sample Content Preview**
   - As a visitor, I want to see example content in each section of the application so I can understand what the tool offers.
   - As a visitor, I want to view sample stories, quests, NPCs, and locations to evaluate if the tool meets my campaign needs.

2. **Feature Discovery**
   - As a visitor, I want to understand the full capabilities of the tool through examples without needing to create an account first.
   - As a visitor, I want clear visual cues that distinguish sample data from actual campaign data.

3. **Conversion Path**
   - As a visitor, I want clear calls-to-action encouraging me to register when I'm ready to create my own campaign data.
   - As a visitor, I want to understand the benefits of registration through the sample content I explore.

### For Authenticated Users

1. **Data Separation**
   - As an authenticated user, I want my real campaign data to be completely separate from the sample data shown to visitors.
   - As an authenticated user, I want to be confident that my private campaign information isn't being shared with the public.

### For Administrators

1. **Sample Data Management**
   - As an administrator, I want to easily update sample content without affecting user data or requiring code changes.
   - As an administrator, I want to control which specific examples appear in each section of the application.

## Functional Requirements

### Data Structure

1. **Public Data Collection**
   - A dedicated Firestore collection called `public-samples` must be created to store all sample data.
   - The collection must be structured with documents for each content type (stories, quests, NPCs, locations).
   - Each document must contain an array of sample items that follow the same schema as their private counterparts.

2. **Data Separation**
   - Public data must be completely isolated from user-specific data.
   - Public data must use a different collection path from authenticated user data.
   - Security rules must explicitly allow read-only access to public data collections.

### Content Display

1. **Conditional Rendering**
   - When a user is not authenticated, the application must display sample data from the public collection.
   - When a user is authenticated, the application must display only their private data, never the public samples.
   - A clear "Sample Data" watermark or indicator must appear on all sample content displays.

2. **Content Limitations**
   - Public data must be limited to a small, representative set (3-5 items per section).
   - Public samples must not include any sensitive, offensive, or copyrighted content.
   - Each public sample must showcase different features of the application.

3. **Banner Display**
   - A notification banner must appear at the top of each page when viewing sample data.
   - The banner must explain that the user is viewing sample data and provide a direct link to register.

### User Conversion

1. **Call-to-Action Elements**
   - Each section displaying sample data must include a prominent "Create Your Own" button that leads to registration.
   - Sample data cards must include subtle visual cues that they are examples, not editable content.
   - When a user attempts to edit sample data, a modal must appear explaining that registration is required to create content.

2. **Feature Highlighting**
   - Sample data must collectively demonstrate all core features of the application.
   - Interactive elements in sample data should provide tooltips explaining what users can do with real data after registration.

### Security Requirements

1. **Permission Structure**
   - Firebase security rules must be updated to allow read-only access to the public samples collection without authentication.
   - Security rules must prevent any write operations to public sample data by non-administrative users.
   - Security rules must ensure private user data requires authentication for both read and write operations.

2. **Rule Implementation**
   - The rules must use the pattern `match /public-samples/{document=**} { allow read: if true; allow write: if false; }` to enable public reading.
   - Implementation must include validation rules that verify request.auth exists before granting access to private collections.

## Non-Functional Requirements

### User Experience

1. **Loading Performance**
   - Sample data must load within 2 seconds on standard connections.
   - Transition between unauthenticated and authenticated states must be seamless.
   - The UI must not flicker or show error states before loading sample data.

2. **Visual Design**
   - Sample data must match the overall design aesthetic of the application.
   - Visual indicators marking sample data must be clear but not intrusive.
   - The interface must maintain responsiveness when displaying sample data on mobile devices.

### Maintainability

1. **Code Organization**
   - The implementation must follow a provider pattern that centralizes the logic for determining which data source to use.
   - Sample data loading must use the same component structures as real data to ensure future feature compatibility.
   - The codebase must include detailed comments explaining the public data implementation for future developers.

2. **Update Mechanisms**
   - Sample data must be updatable without requiring application redeployment.
   - Admin tools should include the ability to manage public sample content.

### Scalability

1. **Performance Impact**
   - The public data implementation must not negatively impact application performance for authenticated users.
   - The implementation must efficiently handle concurrent unauthenticated visitors.

2. **Firestore Usage**
   - The implementation must minimize Firestore read operations when serving public data.
   - Consider using caching strategies to reduce bandwidth and improve performance.

### Security

1. **Data Isolation**
   - The implementation must ensure complete isolation between public and private data.
   - No information about actual users or their campaigns should ever be exposed as public data.

2. **Abuse Prevention**
   - Rate limiting should be implemented on public data access to prevent abuse.
   - IP-based request limiting should be considered for the public data endpoints.