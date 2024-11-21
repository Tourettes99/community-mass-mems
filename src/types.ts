export interface Memory {
  _id: string;
  type: 'url' | 'image' | 'video' | 'audio' | 'text' | 'static';
  url?: string;
  content?: string;
  metadata?: {
    title?: string;
    description?: string;
    siteName?: string;
    favicon?: string;
    mediaType?: 'url' | 'image' | 'video' | 'audio' | 'static';
    previewUrl?: string;
    playbackHtml?: string;
    isPlayable?: boolean;
    fileSize?: number;
    contentType?: string;
    resolution?: string;
    duration?: string;
    format?: string;
    encoding?: string;
    lastModified?: Date;
    rawContent?: string;
  };
  tags?: string[];
  createdAt: string;
}
