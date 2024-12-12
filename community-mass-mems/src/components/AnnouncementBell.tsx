import React, { useState, useEffect } from 'react';
import { Badge, IconButton, Paper, Box, Typography, List, ListItem, ListItemText, Fade } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CloseIcon from '@mui/icons-material/Close';
import useAnnouncementStore from '../stores/announcementStore';

const AnnouncementBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { announcements, fetchAnnouncements, markAsRead } = useAnnouncementStore();
  
  useEffect(() => {
    fetchAnnouncements();
    // Fetch announcements every 5 minutes
    const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAnnouncements]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleBellClick = () => {
    setOpen(!open);
  };

  const handleAnnouncementRead = (_id: string) => {
    markAsRead(_id);
  };

  const unreadCount = announcements.filter(a => !a.read).length;

  return (
    <Box sx={{ position: 'relative', transform: 'translateY(100%)' }}>
      <IconButton
        onClick={handleBellClick}
        sx={{
          backgroundColor: 'background.paper',
          color: 'text.primary',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="primary"
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#ff4444' : '#ff4444',
              color: '#ffffff',
            },
          }}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Fade in={open}>
        <Paper
          sx={{
            position: 'absolute',
            right: 0,
            mt: 1,
            width: 300,
            maxHeight: 400,
            overflow: 'auto',
            backgroundColor: 'background.paper',
            color: 'text.primary',
            boxShadow: 3,
            zIndex: 1000,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Announcements</Typography>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>

          <List>
            {announcements.length === 0 ? (
              <ListItem>
                <ListItemText primary="No announcements yet" />
              </ListItem>
            ) : (
              announcements.map((announcement) => (
                <ListItem
                  key={announcement._id}
                  onClick={() => handleAnnouncementRead(announcement._id)}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: announcement.read ? 'transparent' : 'action.hover',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                  <ListItemText
                    primary={announcement.message}
                    secondary={new Date(announcement.timestamp).toLocaleDateString()}
                  />
                </ListItem>
              ))
            )}
          </List>
        </Paper>
      </Fade>
    </Box>
  );
};

export default AnnouncementBell;
