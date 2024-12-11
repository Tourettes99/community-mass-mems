const nodemailer = require('nodemailer');

class EmailNotificationService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  formatModerationResult(result) {
    let explanation = '';
    
    if (result.decision === 'reject') {
      explanation = 'This content was rejected because:\n';
      
      if (result.custom_violations && result.custom_violations.length > 0) {
        explanation += '- It contained prohibited terms or patterns\n';
      }
      
      if (result.categories && result.categories.length > 0) {
        const categoryMap = {
          'sexual': 'inappropriate sexual content',
          'hate': 'hate speech or discriminatory content',
          'harassment': 'harassing or threatening language',
          'self-harm': 'content related to self-harm',
          'violence': 'violent content',
          'sexual/minors': 'inappropriate content involving minors'
        };
        
        result.categories.forEach(category => {
          explanation += `- It contained ${categoryMap[category] || category}\n`;
        });
      }
    } else {
      explanation = 'This content was approved because it complies with our community guidelines.';
    }

    return explanation;
  }

  async sendModerationNotification(memory, moderationResult) {
    const explanation = this.formatModerationResult(moderationResult);
    const status = moderationResult.decision === 'approve' ? 'Approved' : 'Rejected';
    
    const emailContent = {
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL || process.env.EMAIL_USER,
      subject: `${status}: New text memory submitted for review`,
      text: `
Memory Review Status: ${status}
------------------------
Content: ${memory.content}
Title: ${memory.metadata.title}
Tags: ${memory.tags.length > 0 ? memory.tags.join(', ') : 'No tags'}
Submitted at: ${new Date(memory.submittedAt).toLocaleString()}
ID: ${memory._id}

Moderation Details:
${explanation}

You can review this submission in the moderation console.
      `,
      html: `
        <h2>Memory Review Status: <span style="color: ${status === 'Approved' ? 'green' : 'red'}">${status}</span></h2>
        
        <h3>Submission Details:</h3>
        <ul>
          <li><strong>Content:</strong> ${memory.content}</li>
          <li><strong>Title:</strong> ${memory.metadata.title}</li>
          <li><strong>Tags:</strong> ${memory.tags.length > 0 ? memory.tags.join(', ') : 'No tags'}</li>
          <li><strong>Submitted at:</strong> ${new Date(memory.submittedAt).toLocaleString()}</li>
          <li><strong>ID:</strong> ${memory._id}</li>
        </ul>
        
        <h3>Moderation Details:</h3>
        <p style="white-space: pre-line">${explanation}</p>
        
        <p>You can review this submission in the moderation console.</p>
      `
    };

    try {
      await this.transporter.sendMail(emailContent);
      return true;
    } catch (error) {
      console.error('Error sending moderation notification email:', error);
      return false;
    }
  }
}

module.exports = new EmailNotificationService();
