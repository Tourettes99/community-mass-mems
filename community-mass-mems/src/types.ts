export interface Memory {
  _id: string;
  type: 'url' | 'image' | 'video' | 'audio' | 'text' | 'static';
  url?: string;
  content?: string;
  votes: number;
  metadata?: {
    title?: string;
    description?: string;
    siteName?: string;
    favicon?: string;
    mediaType?: 'url' | 'image' | 'video' | 'audio' | 'static';
    previewUrl?: string;
    embedHtml: string;
    playbackHtml?: string;
    isPlayable?: boolean;
    fileSize?: number;
    contentType?: string;
    resolution?: string;
    duration?: string;
    format?: string;
    encoding?: string;
    lastModified?: Date;
  };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  userVote?: 1 | -1 | 0;
}
