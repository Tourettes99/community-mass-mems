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
    
    // Send moderation email
    try {
      await transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to: process.env.SENDER_EMAIL, // Send to same email for moderation
        subject: 'New Text Memory Submission for Review',
        text: `New text memory submitted for review:
        
Content: ${content}
Submitted at: ${new Date().toLocaleString()}

Please review this submission.`
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
