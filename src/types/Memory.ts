export interface Memory {
  _id: string;
  type: 'url' | 'text' | 'image' | 'video' | 'audio' | 'document';
  url?: string;
  content?: string;
  tags: string[];
  metadata: {
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    mediaType?: string;
    platform?: string;
    contentUrl?: string;
    fileType?: string;
    createdAt?: string;
    updatedAt?: string;
    domain?: string;
    isSecure?: boolean;
  };
  votes: {
    up: number;
    down: number;
  };
}
