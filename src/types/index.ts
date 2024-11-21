export interface Memory {
  _id?: string;
  type: 'url' | 'text' | 'image' | 'video' | 'audio' | 'static';
  url?: string;
  content?: string;
  tags: string[];
  metadata?: {
    title?: string;
    description?: string;
    siteName?: string;
    favicon?: string;
    mediaType?: string;
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
  createdAt?: Date;
  updatedAt?: Date;
}
