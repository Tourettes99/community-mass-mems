# Community Mass Memories

A platform for sharing and moderating community memories.

## Setup

### Environment Variables

The following environment variables need to be set in `netlify/functions/.env`:

```env
# OpenAI API Key for content moderation
OPENAI_API_KEY=your-openai-api-key

# SMTP Settings for email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_TO=notifications@yourdomain.com
```

### Setting up Gmail SMTP

1. Go to your Google Account settings (https://myaccount.google.com/)
2. Navigate to Security
3. Enable 2-Step Verification if not already enabled
4. Under "Signing in to Google", select App Passwords
5. Generate a new App Password:
   - Select app: Mail
   - Select device: Other (Custom name)
   - Enter name: "Netlify Functions"
   - Click Generate
6. Copy the 16-character password
7. Update `SMTP_PASS` in your .env file with this password
8. Update `SMTP_USER` and `SMTP_FROM` with your Gmail address
9. Update `SMTP_TO` with the email where you want to receive notifications

### Testing

Run the system tests to verify everything is working:

```bash
node scripts/test-moderation-errors.js
```

This will test:
- Database connectivity
- Content moderation
- Email notifications

## Features

- Content moderation using OpenAI
- Database health monitoring
- Email notifications for moderation events
- URL metadata extraction
- Support for text and URL submissions
