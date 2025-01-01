import React, { useState, CSSProperties } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Card,
  CardContent,
  Link,
  Tooltip
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  YouTube as YouTubeIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Article as ArticleIcon,
  AudioFile as AudioIcon
} from '@mui/icons-material';
import { Memory } from '../types/Memory';

interface MemoryCardProps {
  memory: Memory;
  selectedTags?: string[];
  onTagClick?: (tag: string) => void;
}

const MemoryCard = ({ memory, selectedTags, onTagClick }: MemoryCardProps): React.ReactElement => {
  const [voteState, setVoteState] = useState({ up: false, down: false });
  const [voteCount, setVoteCount] = useState(memory.votes);

  const getMediaIcon = () => {
    const mediaType = memory.metadata?.mediaType;
    switch (mediaType) {
      case 'image':
        return <ImageIcon />;
      case 'video':
        return <VideoIcon />;
      case 'audio':
        return <AudioIcon />;
      case 'article':
        return <ArticleIcon />;
      default:
        return <LinkIcon />;
    }
  };

  const renderEmbed = () => {
    const { metadata } = memory;
    if (!metadata?.embedHtml && !metadata?.thumbnailUrl) return null;

    const mediaType = metadata.mediaType;
    const embedHtml = metadata.embedHtml;
    const thumbnailUrl = metadata.thumbnailUrl;
    const contentUrl = metadata.contentUrl;

    const containerStyle = {
      position: 'relative' as const,
      width: '100%',
      paddingTop: '56.25%', // 16:9 aspect ratio
      backgroundColor: '#000',
      overflow: 'hidden',
      borderRadius: 1
    };

    const contentStyle: CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      border: 'none',
      objectFit: 'contain'
    };

    if (embedHtml) {
      return (
        <Box sx={containerStyle}>
          <Box
            sx={contentStyle}
            dangerouslySetInnerHTML={{ __html: embedHtml }}
          />
        </Box>
      );
    }

    switch (mediaType) {
      case 'video':
        return (
          <Box sx={containerStyle}>
            <video
              controls
              playsInline
              src={contentUrl}
              style={contentStyle}
              poster={thumbnailUrl}
            />
          </Box>
        );

      case 'audio':
        return (
          <Box sx={{ width: '100%', p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <audio controls style={{ width: '100%' }}>
              <source src={contentUrl} />
              Your browser does not support the audio element.
            </audio>
          </Box>
        );

      case 'image':
        return (
          <Box sx={containerStyle}>
            <img
              src={thumbnailUrl || contentUrl}
              alt={metadata.title || 'Image'}
              style={contentStyle}
              loading="lazy"
            />
          </Box>
        );

      default:
        if (thumbnailUrl) {
          return (
            <Box sx={containerStyle}>
              <img
                src={thumbnailUrl}
                alt={metadata.title || 'Preview'}
                style={contentStyle}
                loading="lazy"
              />
            </Box>
          );
        }
        return null;
    }
  };

  const renderContent = () => {
    const { metadata } = memory;
    if (!metadata) return null;

    return (
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          {getMediaIcon()}
          <Typography variant="h6" component="h2" noWrap>
            {metadata.title || memory.url}
          </Typography>
        </Box>

        {/* Platform info */}
        {metadata.platform && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {metadata.platform}
          </Typography>
        )}

        {/* Description */}
        {metadata.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {metadata.description}
          </Typography>
        )}

        {/* Embed/Media */}
        {renderEmbed()}

        {/* Tags */}
        {memory.tags && memory.tags.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {memory.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onClick={() => onTagClick?.(tag)}
                sx={{
                  bgcolor: selectedTags?.includes(tag) ? 'primary.main' : 'background.default',
                  color: selectedTags?.includes(tag) ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    bgcolor: selectedTags?.includes(tag) ? 'primary.dark' : 'background.paper'
                  }
                }}
              />
            ))}
          </Box>
        )}

        {/* Voting */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
          <IconButton
            size="small"
            color={voteState.up ? 'primary' : 'default'}
            onClick={() => {
              setVoteState({ up: !voteState.up, down: false });
              setVoteCount({
                up: voteCount.up + (voteState.up ? -1 : 1),
                down: voteCount.down
              });
            }}
          >
            <ThumbUpIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2">{voteCount.up}</Typography>

          <IconButton
            size="small"
            color={voteState.down ? 'primary' : 'default'}
            onClick={() => {
              setVoteState({ up: false, down: !voteState.down });
              setVoteCount({
                up: voteCount.up,
                down: voteCount.down + (voteState.down ? -1 : 1)
              });
            }}
          >
            <ThumbDownIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2">{voteCount.down}</Typography>
        </Box>
      </CardContent>
    );
  };

  return (
    <Card>
      <Link
        href={memory.url}
        target="_blank"
        rel="noopener noreferrer"
        underline="none"
        color="inherit"
      >
        {renderContent()}
      </Link>
    </Card>
  );
};

export default MemoryCard;
