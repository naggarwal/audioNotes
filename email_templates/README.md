# Email Templates for Supabase Authentication

This folder contains HTML email templates for Supabase authentication emails.

## Available Templates

- `auth/confirmation.html` - Email confirmation template for new sign-ups

## How to Use with Supabase

1. In your Supabase dashboard, go to Authentication > Email Templates
2. Select the template you want to customize (e.g., "Confirm Signup")
3. Replace the default template with the content from the corresponding file in this folder
4. Save the changes

## Template Variables

Supabase provides the following variables that can be used in email templates:

- `{{ .ConfirmationURL }}` - The confirmation URL for email verification
- `{{ .Token }}` - The raw token (if you want to build a custom URL)
- `{{ .SiteURL }}` - Your site's URL as configured in Supabase

## Custom SMTP Server

If you're hitting rate limits with the built-in email service, you can set up a custom SMTP server:

1. In Supabase dashboard, go to Authentication > Email Templates
2. Click "Set up custom SMTP server"
3. Enter your SMTP server details
4. Test and save the configuration

## Styling Guidelines

- Keep the design simple and responsive
- Test your templates in various email clients
- Inline CSS is recommended for better email client compatibility 