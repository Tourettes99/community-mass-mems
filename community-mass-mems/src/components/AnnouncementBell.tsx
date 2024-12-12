import React, { useState, useEffect } from 'react';
import { Box, Badge, IconButton, Paper, Typography, Fade } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface Announcement {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface AnnouncementBellProps {
  announcements: Announcement[];
  onAnnouncementRead: (id: string) => void;
}

const AnnouncementBell: React.FC<AnnouncementBellProps> = ({ announcements, onAnnouncementRead }) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = announcements.filter(a => !a.read).length;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleBellClick = () => {
    setIsOpen(!isOpen);
  };

  const handleAnnouncementRead = (id: string) => {
    onAnnouncementRead(id);
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <IconButton
        onClick={handleBellClick}
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          width: 40,
          height: 40,
          mb: 1,
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 448 512"
            width="20"
            height="20"
            fill="currentColor"
          >
            <path d="M224 0c-17.7 0-32 14.3-32 32l0 19.2C119 66 64 130.6 64 208l0 18.8c0 47-17.3 92.4-48.5 127.6l-7.4 8.3c-8.4 9.4-10.4 22.9-5.3 34.4S19.4 416 32 416l384 0c12.6 0 24-7.4 29.2-18.9s3.1-25-5.3-34.4l-7.4-8.3C401.3 319.2 384 273.9 384 226.8l0-18.8c0-77.4-55-142-128-156.8L256 32c0-17.7-14.3-32-32-32zm45.3 493.3c12-12 18.7-28.3 18.7-45.3l-64 0-64 0c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7z" />
          </svg>
        </Badge>
      </IconButton>

      <Fade in={isOpen}>
        <Paper
          sx={{
            position: 'absolute',
            right: 0,
            top: '100%',
            width: 300,
            maxHeight: 400,
            overflowY: 'auto',
            zIndex: 1000,
            mt: 1,
            p: 2,
            display: isOpen ? 'block' : 'none',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Announcements</Typography>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          {announcements.length === 0 ? (
            <Typography color="text.secondary">No announcements</Typography>
          ) : (
            announcements.map((announcement) => (
              <Box
                key={announcement.id}
                sx={{
                  p: 2,
                  mb: 1,
                  bgcolor: announcement.read ? 'background.default' : 'action.hover',
                  borderRadius: 1,
                }}
                onClick={() => handleAnnouncementRead(announcement.id)}
              >
                <Typography variant="body1">{announcement.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(announcement.timestamp).toLocaleString()}
                </Typography>
              </Box>
            ))
          )}
        </Paper>
      </Fade>
    </Box>
  );
};

export default AnnouncementBell;
