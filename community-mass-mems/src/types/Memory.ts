export interface WeeklyStats {
  postsThisWeek: number;
  weeklyLimit: number;
  nextReset: string;
}

export interface Memory {
  id?: string;
  _id?: string;
  type: 'url' | 'text' | 'image' | 'video' | 'audio' | 'document';
  url?: string;
  content?: string;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  metadata?: {
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    mediaType?: string;
    platform?: string;
    contentUrl?: string;
    fileType?: string;
    domain?: string;
    isSecure?: boolean;
    createdAt?: string;
    updatedAt?: string;
    favicon?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogType?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    twitterCard?: string;
    embedHtml?: string;
    dimensions?: {
      height: number;
      width: number;
    };
    height?: number;
    width?: number;
    previewUrl?: string;
    siteName?: string;
    publishedDate?: string;
    author?: string;
    authorUrl?: string;
    // Image-specific fields
    image?: {
      url: string;
      type?: string;
      width?: number;
      height?: number;
      alt?: string;
      caption?: string;
      isAnimated?: boolean;
      thumbnails?: {
        small?: string;
        medium?: string;
        large?: string;
      };
    };
    // GIF-specific fields
    gif?: {
      url: string;
      stillUrl?: string;
      width?: number;
      height?: number;
      frames?: number;
      size?: number;
      mp4?: string;
      webp?: string;
    };
    // Video-specific fields
    video?: {
      url?: string;
      type?: string;
      width?: number;
      height?: number;
      duration?: number;
    };
    // New fields for media handling
    isDiscordCdn?: boolean;
    expiresAt?: string;
    format?: string;
    videoId?: string;
    embedUrl?: string;
    meta?: {
      [key: string]: any;
    };
  };
  votes: {
    up: number;
    down: number;
  };
  userVotes?: Map<string, string>;
}
