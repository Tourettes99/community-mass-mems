require('dotenv').config();
const mongoose = require('mongoose');
const Memory = require('./models/Memory');
const nodemailer = require('nodemailer'); // Import nodemailer

let conn = null;
// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',  // Use Gmail service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const connectDb = async () => {
  if (conn == null) {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
  }
  return conn;
};

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Allow': 'POST',
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    const { content } = JSON.parse(event.body);
    if (!content) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'No content provided' })
      };
    }

    await connectDb();
    const memory = new Memory({
      type: 'text',
      content: content, // Store in content field instead of url
      status: 'pending',
      metadata: {
        format: 'text/plain',
        title: content.slice(0, 50) + (content.length > 50 ? '...' : ''), // Create a title from content
        description: content
      }
    });

    await memory.save();
    
    // Send notification email
    try {
      // Create a simple token for moderation links
      const moderationToken = Buffer.from(`${memory._id}:${process.env.EMAIL_USER}`).toString('base64');
      const baseUrl = process.env.REACT_APP_API_URL || 'https://community-mass-mems.onrender.com';
      
      // Files in public directory are served from root in Netlify
      const moderateUrl = `${baseUrl}/moderate.html`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: 'New Text Memory Submission for Review',
        text: `New text memory submitted for review:

Content: ${content}
Title: ${memory.metadata.title || 'No title'}
Submitted at: ${new Date().toLocaleString()}

To moderate this submission, click one of these links:

APPROVE: ${moderateUrl}?action=approve&memoryId=${memory._id}&token=${moderationToken}

REJECT: ${moderateUrl}?action=reject&memoryId=${memory._id}&token=${moderationToken}`,
        html: `
          <h2>New text memory submitted for review</h2>
          <p><strong>Content:</strong> ${content}</p>
          <p><strong>Title:</strong> ${memory.metadata.title || 'No title'}</p>
          <p><strong>Submitted at:</strong> ${new Date().toLocaleString()}</p>
          <div style="margin-top: 20px;">
            <a href="${moderateUrl}?action=approve&memoryId=${memory._id}&token=${moderationToken}" 
               style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; margin-right: 10px; border-radius: 5px;">
              Approve
            </a>
            <a href="${moderateUrl}?action=reject&memoryId=${memory._id}&token=${moderationToken}" 
               style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Reject
            </a>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending moderation email:', emailError);
      // Continue even if email fails
    }
    
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(memory)
    };
  } catch (error) {
    console.error('Error uploading text:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: 'Error uploading text', error: error.message })
    };
  }
};
