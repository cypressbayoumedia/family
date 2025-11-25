# Project Blueprint

## Overview

A private social media application for families to share updates, including text, images, and audio messages. The application is built with Angular and Firebase, leveraging modern features like standalone components and signals.

## Implemented Features

- **Post Creation:**
  - Create posts with text content.
  - Attach images to posts from local files.
  - Record and attach audio messages using the device's microphone.
- **Backend & Cloud Integration:**
  - Firestore for all database needs.
  - Firebase Cloud Storage for image and audio files.
  - Firebase Cloud Functions for backend logic (e.g., user management, subscription handling).
- **User Authentication:**
    - Email/password and Google sign-in.
    - User profiles with display name and profile picture.
- **Family Management:**
    - Create and join family groups.
    - Invite members to a family.
- **Subscription & Billing (Stripe Integration):**
    - Paid subscription plans for families.
    - Secure checkout process using Stripe Checkout.
    - Customer portal for subscription management.
- **Admin Features:**
    - Admin-only page to invite other admins.

## Design & Styling

- **Global Navigation:**
  - A consistent toolbar with a "Home" button, a conditional "Admin Invite" button, and a "Logout" button.
- **Core Components:**
  - Forms for post creation, user login, and signup.
  - A modal dialog for a rich audio recording experience.
  - A dedicated page to display pricing tiers.

# Phase 5: UI/UX Refinement and Polish

## Overview

With the core functional requirements in place, this phase will focus on significantly improving the application's visual appeal, usability, and overall user experience. We will refine existing components, improve layouts, and implement a more cohesive and modern design system to make the app more intuitive and enjoyable to use.

## Plan

1.  **Redesign the Home Page & Post Feed:**
    *   Improve the layout and visual hierarchy of the post feed (`post-list.ts`).
    *   Enhance the design of individual posts (`post-item.ts`) using a card-based system with better spacing, typography, and user avatars.

2.  **Refine the Pricing Page:**
    *   Create a more visually appealing and informative layout for the pricing tiers.
    *   Use distinct cards to present each plan's features and pricing.
    *   Implement a stylish toggle for switching between monthly and yearly billing cycles.

3.  **Enhance the User Profile & Settings Page:**
    *   Improve the layout of the user profile page (`profile.ts`).
    *   Clearly display the user's current family and subscription status.
    *   Add a prominent button for users to manage their subscription via the Stripe Billing Portal.

4.  **Implement Global Style Enhancements:**
    *   Establish and apply a consistent and modern color palette and typography scale throughout the application.
    *   Introduce subtle animations and transitions to create a smoother, more fluid user experience.
