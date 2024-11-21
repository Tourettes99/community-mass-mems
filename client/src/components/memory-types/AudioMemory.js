import React, { useRef, useEffect, useState } from 'react';
import { Box, IconButton, Typography, LinearProgress } from '@mui/material';
import { PlayArrow, Pause } from '@mui/icons-material';

const AudioMemory = ({ memory }) => {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Initialize audio context and analyser
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    analyserRef.current = audioCtxRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;

    // Connect audio element to analyser
    const audio = audioRef.current;
    const source = audioCtxRef.current.createMediaElementSource(audio);
    source.connect(analyserRef.current);
    analyserRef.current.connect(audioCtxRef.current.destination);

    // Set up progress tracking
    audio.addEventListener('timeupdate', () => {
      const percent = (audio.currentTime / audio.duration) * 100;
      setProgress(percent);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
    });

    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const barWidth = (WIDTH / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * HEIGHT;

        const gradient = ctx.createLinearGradient(0, HEIGHT, 0, HEIGHT - barHeight);
        gradient.addColorStop(0, '#FF4D06');  // Your theme color
        gradient.addColorStop(1, '#FF8C00');  // Lighter shade

        ctx.fillStyle = gradient;
        ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const togglePlay = () => {
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      cancelAnimationFrame(animationRef.current);
    } else {
      audioRef.current.play();
      drawVisualizer();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <Box sx={{ p: 2 }}>
      <audio
        ref={audioRef}
        src={`/uploads/${memory.content}`}
        preload="metadata"
      />
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <IconButton onClick={togglePlay} color="primary">
          {isPlaying ? <Pause /> : <PlayArrow />}
        </IconButton>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          {memory.fileName}
        </Typography>
      </Box>

      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ mb: 2 }}
      />

      <canvas
        ref={canvasRef}
        width={300}
        height={60}
        style={{ width: '100%', height: '60px' }}
      />

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
        {memory.fileName} • {memory.fileFormat.toUpperCase()} • {memory.duration}
      </Typography>
    </Box>
  );
};

export default AudioMemory;
