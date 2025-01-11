const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use Gmail service instead of custom SMTP settings
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Function to send moderation notification
async function sendModerationNotification(content, moderationResult, metadata = {}) {
  const subject = moderationResult.flagged
    ? `🚫 Content Moderation Alert: ${moderationResult.reason}`
    : '✅ Content Approved';

  const htmlContent = `
    <h2>${subject}</h2>
    <h3>Content Details:</h3>
    <ul>
      <li><strong>Type:</strong> ${metadata.type || 'Unknown'}</li>
      <li><strong>Content:</strong> ${content}</li>
      ${metadata.title ? `<li><strong>Title:</strong> ${metadata.title}</li>` : ''}
      ${metadata.domain ? `<li><strong>Domain:</strong> ${metadata.domain}</li>` : ''}
    </ul>
    
    <h3>Moderation Results:</h3>
    <ul>
      <li><strong>Status:</strong> ${moderationResult.flagged ? '🚫 Rejected' : '✅ Approved'}</li>
      ${moderationResult.reason ? `<li><strong>Reason:</strong> ${moderationResult.reason}</li>` : ''}
    </ul>

    ${formatCategories(moderationResult.category_scores)}

    <p><strong>Request ID:</strong> ${metadata.requestId}</p>
    <p><strong>User ID:</strong> ${metadata.userId}</p>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: process.env.SMTP_TO,
    subject,
    html: htmlContent
  };

  try {
    // Verify connection configuration
    await transporter.verify();
    console.log('✓ Email service verified');

    // Send mail
    const info = await transporter.sendMail(mailOptions);
    console.log('Moderation notification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending moderation notification email:', error);
    throw error;
  }
}

function formatCategories(scores) {
  if (!scores) return '';

  const categories = Object.entries(scores)
    .filter(([_, score]) => score > 0.1)
    .sort(([_, a], [__, b]) => b - a)
    .map(([category, score]) => {
      const percentage = (score * 100).toFixed(1);
      const color = score > 0.8 ? 'red' : score > 0.5 ? 'orange' : 'gray';
      return `<li><strong>${category}:</strong> <span style="color: ${color}">${percentage}%</span></li>`;
    });

  if (categories.length === 0) return '';

  return `
    <h3>Category Scores:</h3>
    <ul>
      ${categories.join('\n')}
    </ul>
  `;
}

module.exports = {
  transporter,
  sendModerationNotification
};
