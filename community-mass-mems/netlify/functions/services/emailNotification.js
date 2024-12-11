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

  async sendModerationNotification(content, moderationResult) {
    const explanation = this.formatModerationResult(moderationResult);
    const status = moderationResult.decision === 'approve' ? 'Approved' : 'Rejected';
    
    const emailContent = {
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL || process.env.EMAIL_USER,
      subject: `Content Moderation Alert: ${status}`,
      text: `
Content Moderation Report
------------------------
Status: ${status}
Time: ${new Date().toLocaleString()}

Explanation:
${explanation}

Content Preview:
${content.substring(0, 200)}${content.length > 200 ? '...' : ''}

Technical Details:
${JSON.stringify(moderationResult, null, 2)}
      `,
      html: `
        <h2>Content Moderation Report</h2>
        <p><strong>Status:</strong> <span style="color: ${status === 'Approved' ? 'green' : 'red'}">${status}</span></p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        
        <h3>Explanation:</h3>
        <p style="white-space: pre-line">${explanation}</p>
        
        <h3>Content Preview:</h3>
        <p style="background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
          ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}
        </p>
        
        <h3>Technical Details:</h3>
        <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
${JSON.stringify(moderationResult, null, 2)}
        </pre>
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
