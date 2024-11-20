# R1 Community Memories

A beautiful web application for Rabbit R1 users to share and relive memorable moments through images, text, GIFs, audio files, and embedded links.

## Features

- Material UI design with RAL 2005 color scheme
- Dynamic grid layout with pulsing animation effect
- Support for multiple media types:
  - Images (with metadata)
  - GIFs (with metadata)
  - Audio files (with metadata)
  - Text content
  - Embedded links
- Drag-and-drop file upload
- Upload progress indicator
- Cancellable uploads
- Responsive design

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Setup

1. Install MongoDB and make sure it's running on port 27017

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd client
npm install
```

4. Create an `uploads` directory in the root folder:
```bash
mkdir uploads
```

5. Start the backend server:
```bash
npm start
```

6. In a new terminal, start the frontend development server:
```bash
cd client
npm start
```

The application will be available at http://localhost:3000

## Environment Variables

Create a `.env` file in the root directory with the following variables:
```
MONGODB_URI=mongodb://localhost:27017/r1memories
PORT=5000
```

## File Upload Limits

- Maximum file size: 10MB
- Supported file types:
  - Images (jpg, png, gif)
  - Audio (mp3, wav)
  - Text files
  - JSON files
