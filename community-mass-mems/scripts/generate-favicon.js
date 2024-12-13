const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateFavicons() {
  const inputSvg = path.join(__dirname, '../public/favicon.svg');
  const publicDir = path.join(__dirname, '../public');

  // Read the SVG file
  const svgBuffer = await fs.readFile(inputSvg);

  // Generate different sizes
  const sizes = [16, 32, 48, 64, 128, 256];
  
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, `favicon-${size}x${size}.png`));
  }

  // Copy 32x32 as favicon.ico (browsers will handle it)
  await fs.copyFile(
    path.join(publicDir, 'favicon-32x32.png'),
    path.join(publicDir, 'favicon.ico')
  );

  // Generate apple-touch-icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('Favicons generated successfully!');
}

generateFavicons().catch(console.error);
