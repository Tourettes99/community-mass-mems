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
        console.log('Fetching announcement...');
        const response = await fetch('/.netlify/functions/announcement');
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Announcement data:', data);
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

  if (!announcement?.active) {
    console.log('No active announcement');
    return null;
  }

  console.log('Rendering announcement:', announcement.message);

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bg="red.500"
      color="white"
      py={2}
      zIndex={9999}
      overflow="hidden"
      whiteSpace="nowrap"
      width="100%"
      height="40px"
      display="flex"
      alignItems="center"
      justifyContent="flex-start"
    >
      <Text
        animation={`${scroll} 30s linear infinite`}
        display="inline-block"
        fontWeight="bold"
        fontSize="lg"
        px={4}
        style={{ whiteSpace: 'nowrap' }}
      >
        {announcement.message}
      </Text>
    </Box>
  );
};

export default AnnouncementBanner;
