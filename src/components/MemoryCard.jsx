import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Link,
  Skeleton,
  CardActionArea,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Article as ArticleIcon,
  Link as LinkIcon,
} from '@mui/icons-material';

const MemoryCard = ({ memory }) => {
  if (!memory) return null;

  const {
    title,
    description,
    url,
    imageUrl,
    type,
    siteName,
    authorName,
    publishedTime,
    embedHtml,
    previewType,
    metadata
  } = memory;

  const getMediaIcon = () => {
    switch (type) {
      case 'image':
        return <ImageIcon />;
      case 'video':
        return <VideoIcon />;
      case 'article':
        return <ArticleIcon />;
      default:
        return <LinkIcon />;
    }
  };

  const renderMedia = () => {
    if (!previewType || previewType === 'none') {
      return null;
    }

    if (embedHtml) {
      return (
        <Box
          sx={{
            position: 'relative',
            paddingTop: '56.25%',
            bgcolor: 'background.default',
            overflow: 'hidden',
          }}
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
      );
    }

    if (imageUrl || metadata?.previewUrl) {
      return (
        <CardMedia
          component="img"
          image={imageUrl || metadata.previewUrl}
          alt={title || 'Memory image'}
          sx={{
            height: 0,
            paddingTop: '56.25%',
            objectFit: 'cover',
          }}
        />
      );
    }

    return null;
  };

  // Don't render a card for empty or invalid memories
  if (!url && !description && !title) return null;

  return (
    <Card
      elevation={1}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      {renderMedia()}
      
      <CardContent>
        <Stack spacing={1}>
          {siteName && (
            <Chip
              label={siteName}
              size="small"
              icon={getMediaIcon()}
              sx={{ alignSelf: 'flex-start' }}
            />
          )}
          
          {title && (
            <Link
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              color="inherit"
            >
              <Typography
                variant="h6"
                component="h2"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.2,
                  mb: 1,
                  '&:hover': {
                    color: 'primary.main',
                  }
                }}
              >
                {title}
              </Typography>
            </Link>
          )}
          
          {description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {description}
            </Typography>
          )}

          {(authorName || publishedTime) && (
            <Box sx={{ mt: 'auto', pt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {authorName && `By ${authorName}`}
                {authorName && publishedTime && ' · '}
                {publishedTime && new Date(publishedTime).toLocaleDateString()}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default MemoryCard;
