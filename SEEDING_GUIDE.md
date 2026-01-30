# Seeding the Database with Your User Data

This guide explains how to seed the database with dummy customer data that belongs to your logged-in user.

## Quick Start

1. **Get Your User ID**
   - Start the development server: `npm run dev`
   - Sign in to the application
   - Navigate to `/get-user-id` in your browser
   - Copy your Clerk User ID displayed on the page

2. **Run the Seed Script**
   ```bash
   npm run db:seed YOUR_USER_ID_HERE
   ```

   Example:
   ```bash
   npm run db:seed user_2abc123def456
   ```

3. **View Your Data**
   - Navigate to `/dashboard` to see your customer cards

## What Gets Created

The seed script creates 4 sample customers with various notes:

1. **TechStart Solutions** (Active LTS)
   - 3 notes about setup, quarterly review, and security patches

2. **Global Enterprises Inc** (Expired LTS)
   - 2 notes about LTS renewal and follow-ups

3. **DataFlow Systems** (Active LTS)
   - 3 notes about migration, bug reports, and fixes

4. **CloudNet Partners** (Unknown LTS)
   - 1 note about new customer onboarding

## Troubleshooting

### Data Not Showing in Dashboard

If you run the seed script without providing your User ID, it will create data for a test user (`test_user_123`) that won't appear in your dashboard.

**Solution**: Delete the test data and re-run with your actual User ID:
```bash
# Re-run with your actual user ID
npm run db:seed YOUR_USER_ID_HERE
```

### Finding Your User ID

You can always find your User ID by visiting `/get-user-id` while logged in to the application.

## Database Schema

The seed script populates two tables:
- `customers` - Customer information including name, patch dates, and LTS status
- `customer_notes` - Timestamped notes associated with each customer

All data is associated with the `userId` you provide, ensuring proper data isolation per user.
