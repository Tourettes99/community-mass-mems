import React, { useEffect, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const scroll = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(-100%); }
`;

interface Announcement {
  message: string;
  active: boolean;
}

export const AnnouncementBanner: React.FC = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const response = await fetch('/.netlify/functions/announcement');
        const data = await response.json();
        if (data && data.active) {
          setAnnouncement(data);
        } else {
          setAnnouncement(null);
        }
      } catch (error) {
        console.error('Failed to fetch announcement:', error);
      }
    };

    // Initial fetch
    fetchAnnouncement();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchAnnouncement, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!announcement?.active) return null;

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bg="red.500"
      color="white"
      py={2}
      zIndex="banner"
      overflow="hidden"
      whiteSpace="nowrap"
    >
      <Text
        animation={`${scroll} 20s linear infinite`}
        display="inline-block"
        fontWeight="bold"
      >
        {announcement.message}
      </Text>
    </Box>
  );
};

export default AnnouncementBanner;
