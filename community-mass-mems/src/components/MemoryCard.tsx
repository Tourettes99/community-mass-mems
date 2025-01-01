import React, { useState, CSSProperties, ReactElement } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Card,
  CardContent,
  Link,
  Tooltip,
  CardActionArea,
  CardMedia,
  Paper,
  Avatar,
  Stack,
  Divider
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  YouTube as YouTubeIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Article as ArticleIcon,
  AudioFile as AudioIcon,
  OpenInNew as OpenInNewIcon,
  PlayArrow as PlayArrowIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Public as PublicIcon
} from '@mui/icons-material';
import { Memory } from '../types/Memory';

interface MemoryCardProps {
  memory: Memory;
  selectedTags?: string[];
  onTagClick?: (tag: string) => void;
}

declare module 'react' {
  interface HTMLAttributes<T> {
    playsInline?: boolean;
  }
}

const MemoryCard = ({ memory, selectedTags, onTagClick }: MemoryCardProps): ReactElement => {
  const [voteState, setVoteState] = useState({ up: false, down: false });
  const [voteCount, setVoteCount] = useState(memory.votes);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleVote = (type: 'up' | 'down', event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (type === 'up') {
      setVoteState({ up: !voteState.up, down: false });
      setVoteCount({
        up: voteCount.up + (voteState.up ? -1 : 1),
        down: voteCount.down
      });
    } else {
      setVoteState({ up: false, down: !voteState.down });
      setVoteCount({
        up: voteCount.up,
        down: voteCount.down + (voteState.down ? -1 : 1)
      });
    }
  };

  const getMediaIcon = () => {
    const mediaType = memory.metadata?.mediaType;
    const platform = memory.metadata?.platform?.toLowerCase();

    if (platform === 'youtube') return <YouTubeIcon sx={{ color: 'red' }} />;
    if (platform === 'soundcloud') return <AudioIcon sx={{ color: '#ff7700' }} />;
    if (platform === 'twitter' || platform === 'x') return <img src="/x-logo.png" alt="X" style={{ width: 24, height: 24 }} />;

    switch (mediaType) {
      case 'image':
        return <ImageIcon color="primary" />;
      case 'video':
        return <VideoIcon color="secondary" />;
      case 'audio':
        return <AudioIcon color="success" />;
      case 'article':
        return <ArticleIcon color="info" />;
      default:
        return <LinkIcon />;
    }
  };

  const renderMetadata = () => {
    const { metadata } = memory;
    if (!metadata) return null;

    const siteName = metadata.siteName || metadata.ogTitle || metadata.twitterTitle;
    const author = metadata.author || metadata.authorUrl;
    const description = metadata.description || metadata.ogDescription || metadata.twitterDescription;
    const publishedDate = metadata.publishedDate || metadata.createdAt;

    return (
      <Stack 
        direction="row" 
        spacing={2} 
        divider={<Divider orientation="vertical" flexItem />}
        sx={{ 
          mb: 2, 
          px: 2, 
          py: 1, 
          bgcolor: 'background.paper',
          borderRadius: 1,
          flexWrap: 'wrap'
        }}
      >
        {siteName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PublicIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {siteName}
            </Typography>
          </Box>
        )}
        {author && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {author}
            </Typography>
          </Box>
        )}
        {publishedDate && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {new Date(publishedDate).toLocaleDateString()}
            </Typography>
          </Box>
        )}
      </Stack>
    );
  };

  const renderEmbed = () => {
    const { metadata } = memory;
    if (!metadata) return null;

    const mediaType = metadata.mediaType;
    const embedHtml = metadata.embedHtml;
    const thumbnailUrl = metadata.thumbnailUrl || metadata.ogImage || metadata.twitterImage;
    const contentUrl = metadata.contentUrl;
    const platform = metadata.platform?.toLowerCase();
    const title = metadata.title || metadata.ogTitle || metadata.twitterTitle;
    const description = metadata.description || metadata.ogDescription || metadata.twitterDescription;

    const containerStyle = {
      position: 'relative' as const,
      width: '100%',
      paddingTop: '56.25%', // 16:9 aspect ratio
      backgroundColor: '#000',
      overflow: 'hidden',
      borderRadius: 1,
      mb: 2
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

    // Special handling for YouTube
    if (platform === 'youtube' && embedHtml) {
      return (
        <Paper 
          elevation={0} 
          sx={{ 
            bgcolor: 'background.paper',
            borderRadius: 2,
            overflow: 'hidden',
            mb: 2
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Box sx={containerStyle}>
            <Box
              sx={contentStyle}
              dangerouslySetInnerHTML={{ __html: embedHtml }}
            />
          </Box>
          <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.03)' }}>
            <Typography variant="subtitle2" color="text.primary">
              {title}
            </Typography>
            {description && (
              <Typography variant="caption" color="text.secondary">
                {description}
              </Typography>
            )}
          </Box>
        </Paper>
      );
    }

    // Special handling for Twitter/X
    if ((platform === 'twitter' || platform === 'x') && embedHtml) {
      return (
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'background.paper',
            borderRadius: 2,
            p: 2,
            mb: 2
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Tweet from {metadata.author || 'Twitter'}
            </Typography>
          </Box>
          <Box
            dangerouslySetInnerHTML={{ __html: embedHtml }}
          />
        </Paper>
      );
    }

    // Special handling for SoundCloud
    if (platform === 'soundcloud' && embedHtml) {
      return (
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'background.paper',
            borderRadius: 2,
            overflow: 'hidden',
            mb: 2
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Box sx={{ p: 2, bgcolor: '#ff7700', color: 'white' }}>
            <Typography variant="subtitle2">
              {title || 'SoundCloud Track'}
            </Typography>
          </Box>
          <Box
            dangerouslySetInnerHTML={{ __html: embedHtml }}
          />
        </Paper>
      );
    }

    if (embedHtml) {
      return (
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'background.paper',
            borderRadius: 2,
            overflow: 'hidden',
            mb: 2
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Box sx={containerStyle}>
            <Box
              sx={contentStyle}
              dangerouslySetInnerHTML={{ __html: embedHtml }}
            />
          </Box>
          {title && (
            <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.03)' }}>
              <Typography variant="subtitle2" color="text.primary">
                {title}
              </Typography>
              {description && (
                <Typography variant="caption" color="text.secondary">
                  {description}
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      );
    }

    switch (mediaType) {
      case 'video':
        return (
          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              mb: 2
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={containerStyle}>
              <video
                controls
                playsInline
                src={contentUrl}
                style={contentStyle}
                poster={thumbnailUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </Box>
            <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.03)' }}>
              <Typography variant="subtitle2" color="text.primary">
                {title || 'Video'}
              </Typography>
              {description && (
                <Typography variant="caption" color="text.secondary">
                  {description}
                </Typography>
              )}
            </Box>
          </Paper>
        );

      case 'audio':
        return (
          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: 'background.paper',
              borderRadius: 2,
              p: 2,
              mb: 2
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <AudioIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle2">
                  {title || 'Audio Track'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {metadata.author || 'Unknown Artist'}
                </Typography>
              </Box>
            </Box>
            <audio 
              controls 
              style={{ width: '100%' }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              <source src={contentUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </Paper>
        );

      case 'image':
        return (
          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              mb: 2
            }}
          >
            <Box sx={containerStyle}>
              <img
                src={thumbnailUrl || contentUrl}
                alt={title || 'Image'}
                style={contentStyle}
                loading="lazy"
              />
            </Box>
            {(title || description) && (
              <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.03)' }}>
                {title && (
                  <Typography variant="subtitle2" color="text.primary">
                    {title}
                  </Typography>
                )}
                {description && (
                  <Typography variant="caption" color="text.secondary">
                    {description}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        );

      default:
        if (thumbnailUrl) {
          return (
            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: 'background.paper',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 2
              }}
            >
              <Box sx={containerStyle}>
                <img
                  src={thumbnailUrl}
                  alt={title || 'Preview'}
                  style={contentStyle}
                  loading="lazy"
                />
              </Box>
              {(title || description) && (
                <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.03)' }}>
                  {title && (
                    <Typography variant="subtitle2" color="text.primary">
                      {title}
                    </Typography>
                  )}
                  {description && (
                    <Typography variant="caption" color="text.secondary">
                      {description}
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
          );
        }
        return null;
    }
  };

  const renderContent = () => {
    const { metadata } = memory;
    if (!metadata) return null;

    const title = metadata.title || metadata.ogTitle || metadata.twitterTitle || memory.url;
    const description = metadata.description || metadata.ogDescription || metadata.twitterDescription;

    return (
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          <Box sx={{ 
            bgcolor: 'primary.main', 
            color: 'primary.contrastText',
            p: 1,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {getMediaIcon()}
          </Box>
          <Typography variant="h6" component="h2" noWrap>
            {title}
          </Typography>
        </Box>

        {/* Metadata */}
        {renderMetadata()}

        {/* Description */}
        {description && (
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
            {description}
          </Typography>
        )}

        {/* Embed/Media */}
        {renderEmbed()}

        {/* Tags */}
        {memory.tags && memory.tags.length > 0 && (
          <Box 
            sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {memory.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTagClick?.(tag);
                }}
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

        {/* Footer */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 2,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Voting */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <IconButton
              size="small"
              color={voteState.up ? 'primary' : 'default'}
              onClick={(e) => handleVote('up', e)}
            >
              <ThumbUpIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2">{voteCount.up}</Typography>

            <IconButton
              size="small"
              color={voteState.down ? 'primary' : 'default'}
              onClick={(e) => handleVote('down', e)}
            >
              <ThumbDownIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2">{voteCount.down}</Typography>
          </Box>

          {/* Visit Link Button */}
          <Link
            href={memory.url}
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'primary.main',
              '&:hover': {
                color: 'primary.dark'
              }
            }}
          >
            <OpenInNewIcon fontSize="small" />
            <Typography variant="body2">Visit Site</Typography>
          </Link>
        </Box>
      </CardContent>
    );
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        '&:hover': {
          boxShadow: 6
        },
        transition: 'box-shadow 0.2s'
      }}
    >
      <CardActionArea sx={{ flexGrow: 1 }}>
        {renderContent()}
      </CardActionArea>
    </Card>
  );
};

export default MemoryCard;
