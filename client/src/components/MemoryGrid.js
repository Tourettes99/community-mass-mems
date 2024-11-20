import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Typography,
  Link,
  Fade,
  CardHeader,
  Avatar,
  IconButton,
  Chip,
  Slider,
  Stack
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import ImageIcon from '@mui/icons-material/Image';
import GifIcon from '@mui/icons-material/Gif';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import LinkIcon from '@mui/icons-material/Link';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 4px 20px rgba(255, 77, 6, 0.1);
  }
  50% {
    transform: scale(1.02);
    opacity: 0.95;
    box-shadow: 0 8px 30px rgba(255, 77, 6, 0.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 4px 20px rgba(255, 77, 6, 0.1);
  }
`;

const StyledCard = styled(Card)(({ theme, delay }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  animation: `${pulse} 3s infinite`,
  animationDelay: `${delay}s`,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 12px 40px rgba(255, 77, 6, 0.25)',
  }
}));

const MetadataChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: 'rgba(255, 77, 6, 0.1)',
  color: theme.palette.primary.main,
  '& .MuiChip-icon': {
    color: theme.palette.primary.main,
  }
}));

const AudioPlayer = ({ audioUrl, fileName, onError }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const isSetup = useRef(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.crossOrigin = "anonymous";
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const setupAudioContext = async () => {
    if (!audioRef.current || isSetup.current) return;

    try {
      // Create new AudioContext only if it doesn't exist or is closed
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Resume AudioContext if it's suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
      }

      if (!sourceRef.current && audioRef.current) {
        audioRef.current.crossOrigin = "anonymous";
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }

      isSetup.current = true;
    } catch (error) {
      console.error('Error setting up audio context:', error);
      onError();
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.crossOrigin = "anonymous";
      audioRef.current.load();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }

      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      isSetup.current = false;
    };
  }, [audioUrl, setupAudioContext]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const animate = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      analyserRef.current.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(255, 77, 6, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 77, 6, 0.2)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (!duration && audio.duration) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const handleError = () => {
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      onError();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleLoadedMetadata);

    const playAudio = async () => {
      try {
        await setupAudioContext();
        await audio.play();
        animate();
      } catch (error) {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
      }
    };

    if (isPlaying) {
      playAudio();
    } else {
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleLoadedMetadata);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, onError, duration]);

  const handlePlayPause = async () => {
    try {
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimeChange = (event, newValue) => {
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.currentTime = newValue;
      setCurrentTime(newValue);
    }
  };

  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue);
    setIsMuted(newValue === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(1);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <AudioFileIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
        <Typography variant="h6" color="primary" noWrap sx={{ flex: 1 }}>
          {fileName}
        </Typography>
      </Box>

      <canvas
        ref={canvasRef}
        width={300}
        height={60}
        style={{
          width: '100%',
          height: '60px',
          backgroundColor: 'rgba(255, 77, 6, 0.05)',
          borderRadius: '8px',
          marginBottom: '16px'
        }}
      />

      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={handlePlayPause}
            sx={{
              color: 'primary.main',
              '&:hover': { backgroundColor: 'rgba(255, 77, 6, 0.1)' }
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 45 }}>
            {formatTime(currentTime)}
          </Typography>
          
          <Slider
            value={currentTime}
            max={duration || 100}
            onChange={handleTimeChange}
            sx={{
              color: 'primary.main',
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: '0 0 0 8px rgba(255, 77, 6, 0.1)',
                },
              },
              '& .MuiSlider-rail': {
                opacity: 0.3,
              },
            }}
          />
          
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 45 }}>
            {formatTime(duration)}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 130 }}>
            <IconButton
              onClick={toggleMute}
              sx={{
                color: 'primary.main',
                '&:hover': { backgroundColor: 'rgba(255, 77, 6, 0.1)' }
              }}
            >
              {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
            </IconButton>
            <Slider
              value={volume}
              min={0}
              max={1}
              step={0.1}
              onChange={handleVolumeChange}
              sx={{
                width: 80,
                ml: 1,
                color: 'primary.main',
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12,
                },
              }}
            />
          </Box>
        </Box>
      </Stack>
    </Box>
  );
};

const MemoryGrid = ({ memories }) => {
  const [shuffledMemories, setShuffledMemories] = useState([]);
  const [errorMemories, setErrorMemories] = useState(new Set());

  useEffect(() => {
    const shuffleMemories = () => {
      const shuffled = [...memories].sort(() => Math.random() - 0.5);
      setShuffledMemories(shuffled);
    };

    shuffleMemories();
    const interval = setInterval(shuffleMemories, 30000);
    return () => clearInterval(interval);
  }, [memories]);

  const handleMediaError = (memoryId) => {
    setErrorMemories(prev => new Set([...prev, memoryId]));
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'image': return <ImageIcon />;
      case 'gif': return <GifIcon />;
      case 'audio': return <AudioFileIcon />;
      case 'text': return <TextSnippetIcon />;
      case 'link': return <LinkIcon />;
      default: return null;
    }
  };

  const renderMemoryContent = (memory) => {
    if (errorMemories.has(memory._id)) {
      return null;
    }

    switch (memory.type) {
      case 'image':
      case 'gif':
        return (
          <>
            <CardMedia
              component="img"
              height="240"
              image={`http://localhost:5000/uploads/${memory.content}`}
              alt={memory.fileName}
              onError={() => handleMediaError(memory._id)}
              sx={{
                objectFit: 'cover',
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                }
              }}
            />
            <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <MetadataChip
                icon={memory.type === 'image' ? <ImageIcon /> : <GifIcon />}
                label={`${memory.fileName} (${memory.dimensions || 'N/A'})`}
                size="small"
              />
              <MetadataChip
                label={memory.fileFormat}
                size="small"
              />
            </Box>
          </>
        );
      case 'audio':
        return (
          <AudioPlayer
            audioUrl={`http://localhost:5000/uploads/${memory.content}`}
            fileName={memory.fileName}
            onError={() => handleMediaError(memory._id)}
          />
        );
      case 'link':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {memory.urlMetadata?.image && (
              <CardMedia
                component="img"
                height="200"
                image={memory.urlMetadata.image}
                alt={memory.urlMetadata.title}
                sx={{
                  objectFit: 'cover',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  }
                }}
              />
            )}
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {memory.urlMetadata?.favicon && (
                  <Box
                    component="img"
                    src={memory.urlMetadata.favicon}
                    alt=""
                    sx={{
                      width: 20,
                      height: 20,
                      mr: 1,
                      borderRadius: '4px'
                    }}
                  />
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  {memory.urlMetadata?.siteName || new URL(memory.content).hostname}
                </Typography>
              </Box>
              
              <Link
                href={memory.content}
                target="_blank"
                rel="noopener noreferrer"
                color="primary"
                underline="none"
                sx={{
                  display: 'block',
                  mb: 1,
                  '&:hover': {
                    '& .MuiTypography-root': {
                      color: 'primary.main',
                    }
                  }
                }}
              >
                <Typography
                  variant="h6"
                  component="div"
                  sx={{
                    transition: 'color 0.2s ease',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    lineHeight: 1.3,
                    mb: 1
                  }}
                >
                  {memory.urlMetadata?.title || memory.content}
                </Typography>
              </Link>

              {memory.urlMetadata?.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.5
                  }}
                >
                  {memory.urlMetadata.description}
                </Typography>
              )}

              <Box sx={{ mt: 'auto', display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <MetadataChip
                  icon={<LinkIcon />}
                  label={new URL(memory.content).hostname}
                  size="small"
                />
                {memory.urlMetadata?.type && (
                  <MetadataChip
                    label={memory.urlMetadata.type}
                    size="small"
                  />
                )}
              </Box>
            </CardContent>
          </Box>
        );
      default:
        return (
          <CardContent>
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {memory.content}
            </Typography>
          </CardContent>
        );
    }
  };

  return (
    <Grid container spacing={3}>
      {shuffledMemories.map((memory, index) => (
        <Grid item xs={12} sm={6} md={4} key={memory._id}>
          <Fade in timeout={500}>
            <StyledCard delay={index * 0.2}>
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {getTypeIcon(memory.type)}
                  </Avatar>
                }
                title={
                  <Typography variant="subtitle2" color="text.secondary">
                    {new Date(memory.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                }
              />
              {renderMemoryContent(memory)}
            </StyledCard>
          </Fade>
        </Grid>
      ))}
    </Grid>
  );
};

export default MemoryGrid;
