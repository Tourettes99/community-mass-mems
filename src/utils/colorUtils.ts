// RAL 2005 Luminous Orange color
export const RAL_2005 = '#FF4D2A';

/**
 * Converts an image to RAL 2005 orange using a canvas
 * @param imageUrl The URL of the image to convert
 * @returns Promise that resolves with the orange-tinted image data URL
 */
export const convertToOrange = (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';  // Enable CORS for external images

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set canvas size to image size
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to RAL 2005 orange while preserving alpha
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3] / 255;  // Normalize alpha to 0-1
        
        // RAL 2005 RGB values (255, 77, 42)
        data[i] = Math.round(255 * alpha);     // Red
        data[i + 1] = Math.round(77 * alpha);  // Green
        data[i + 2] = Math.round(42 * alpha);  // Blue
      }

      // Put the modified image data back
      ctx.putImageData(imageData, 0, 0);

      // Convert to data URL
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Handle CORS errors by falling back to original URL
    img.src = imageUrl;
    setTimeout(() => {
      if (!img.complete) {
        resolve(imageUrl); // Fallback to original if loading takes too long
      }
    }, 3000);
  });
};
