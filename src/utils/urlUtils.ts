/**
 * Utility functions for handling URLs in the application
 */

/**
 * Validates and normalizes a file URL
 * @param url The URL to validate and normalize
 * @returns The normalized URL or null if invalid
 */
export const normalizeFileUrl = (url: string): string | null => {
  try {
    // Handle data URLs
    if (url.startsWith('data:')) {
      return url;
    }

    // Handle relative paths
    if (url.startsWith('./') || url.startsWith('../')) {
      return new URL(url, window.location.href).href;
    }

    // Handle absolute paths
    if (url.startsWith('/')) {
      return new URL(url, window.location.origin).href;
    }

    // Handle full URLs
    new URL(url); // This will throw if invalid
    return url;
  } catch (error) {
    console.error('Invalid URL:', url, error);
    return null;
  }
};

/**
 * Checks if a URL is from an allowed domain
 * @param url The URL to check
 * @param allowedDomains List of allowed domains
 * @returns boolean indicating if the URL is allowed
 */
export const isAllowedDomain = (url: string, allowedDomains: string[]): boolean => {
  try {
    if (url.startsWith('data:')) return true;
    if (url.startsWith('blob:')) return true;
    
    const urlObj = new URL(url);
    return allowedDomains.some(domain => 
      urlObj.hostname === domain || 
      urlObj.hostname.endsWith(`.${domain}`)
    );
  } catch (error) {
    console.error('Error checking URL domain:', url, error);
    return false;
  }
};

/**
 * Converts a file path or URL to a data URL if needed
 * @param url The URL to convert
 * @returns Promise resolving to a data URL
 */
export const toDataUrl = async (url: string): Promise<string> => {
  try {
    // If already a data URL, return as is
    if (url.startsWith('data:')) {
      return url;
    }

    // Fetch the file and convert to data URL
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting to data URL:', url, error);
    throw error;
  }
};
