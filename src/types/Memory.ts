export interface Memory {
  _id: string;
  type: 'url' | 'text';
  url?: string;
  content?: string;
  tags: string[];
  metadata: {
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    mediaType?: string;
    createdAt: string;
    updatedAt: string;
  };
  votes: {
    up: number;
    down: number;
  };
}
