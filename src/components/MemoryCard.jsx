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
    if (embedHtml) {
      return (
        <Box
          sx={{
            position: 'relative',
            paddingTop: '56.25%', // 16:9 aspect ratio
            bgcolor: 'background.default',
            overflow: 'hidden',
          }}
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
      );
    }

    if (imageUrl) {
      return (
        <CardMedia
          component="img"
          image={imageUrl}
          alt={title || 'Memory image'}
          sx={{
            height: 0,
            paddingTop: '56.25%', // 16:9 aspect ratio
            objectFit: 'cover',
          }}
        />
      );
    }

    return (
      <Box
        sx={{
          height: 0,
          paddingTop: '56.25%',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {getMediaIcon()}
        </Box>
      </Box>
    );
  };

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
      <CardActionArea
        component={Link}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ flexGrow: 1 }}
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
            
            <Typography
              gutterBottom
              variant="h6"
              component="h2"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.2,
                minHeight: '2.4em',
              }}
            >
              {title || 'Untitled Memory'}
            </Typography>

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

            <Box
              sx={{
                mt: 'auto',
                pt: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {authorName && (
                <Typography variant="caption" color="text.secondary">
                  By {authorName}
                </Typography>
              )}
              
              {publishedTime && (
                <Typography variant="caption" color="text.secondary">
                  {new Date(publishedTime).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default MemoryCard;
