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

  const handleAnnouncementRead = (id: string) => {
    markAsRead(id);
  };

  const unreadCount = announcements.filter(a => !a.read).length;

  return (
    <Box sx={{ position: 'relative' }}>
      <IconButton
        onClick={handleBellClick}
        sx={{
          backgroundColor: 'background.paper',
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
              backgroundColor: '#ff4444',
              color: 'white',
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
            width: 300,
            maxHeight: 400,
            overflowY: 'auto',
            zIndex: 1000,
            mt: 1,
            p: 2,
            display: open ? 'block' : 'none',
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
                  key={announcement.id}
                  onClick={() => handleAnnouncementRead(announcement.id)}
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
