const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateOGImage() {
  const width = 1200;
  const height = 630;
  const padding = 40;
  const iconSize = 120;

  // Create a new image with the RAL 2005 Luminous Orange background
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FF4D06;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#FF6B06;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)"/>
      <g transform="translate(${padding}, ${padding})">
        <text 
          x="${iconSize + padding * 2}" 
          y="${height/2 - padding}" 
          font-family="Arial" 
          font-size="72" 
          font-weight="bold" 
          fill="white"
        >R1 Community</text>
        <text 
          x="${iconSize + padding * 2}" 
          y="${height/2 + padding}" 
          font-family="Arial" 
          font-size="72" 
          font-weight="bold" 
          fill="white"
        >Memories</text>
      </g>
    </svg>
  `;

  // Read the favicon SVG
  const faviconSvg = await fs.readFile(path.join(__dirname, '../public/favicon.svg'), 'utf8');
  
  // Extract the path data from the favicon SVG
  const pathMatch = faviconSvg.match(/<path[^>]*d="([^"]*)"[^>]*>/);
  if (!pathMatch) {
    throw new Error('Could not find path data in favicon SVG');
  }

  // Create the complete SVG with the favicon
  const completeSvg = svg.replace('</g>', `
    <g transform="translate(${padding}, ${height/2 - iconSize/2}) scale(${iconSize/24})">
      <path d="${pathMatch[1]}" fill="white"/>
    </g>
    </g>
  `);

  // Convert SVG to PNG
  await sharp(Buffer.from(completeSvg))
    .png()
    .toFile(path.join(__dirname, '../public/og-image.png'));

  console.log('Open Graph image generated successfully!');
}

generateOGImage().catch(console.error);
