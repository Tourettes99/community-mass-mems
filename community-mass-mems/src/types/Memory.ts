export interface Memory {
  id?: string;
  _id?: string;
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
    domain?: string;
    isSecure?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  votes: {
    up: number;
    down: number;
  };
  userVotes?: Map<string, string>;
}
