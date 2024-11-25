import React from 'react';
import { 
  Box, 
  Chip, 
  TextField, 
  Autocomplete, 
  IconButton, 
  Tooltip,
  useTheme
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';

interface TagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onTagsChange: (newTags: string[]) => void;
}

const TagFilter: React.FC<TagFilterProps> = ({ 
  availableTags, 
  selectedTags, 
  onTagsChange 
}) => {
  const theme = useTheme();

  const handleTagDelete = (tagToDelete: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToDelete));
  };

  const handleClearAll = () => {
    onTagsChange([]);
  };

  return (
    <Box sx={{ 
      mb: 3,
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 2
    }}>
      <Autocomplete
        multiple
        id="tags-filter"
        options={availableTags}
        value={selectedTags}
        onChange={(_, newValue) => onTagsChange(newValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder={selectedTags.length === 0 ? "Filter by tags..." : ""}
            size="small"
            sx={{ minWidth: 300 }}
          />
        )}
        renderTags={() => null}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: 'background.paper',
            borderRadius: 1
          }
        }}
      />
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: 1,
        flex: 1,
        alignItems: 'center'
      }}>
        {selectedTags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            onDelete={() => handleTagDelete(tag)}
            color="primary"
            size="small"
          />
        ))}
        {selectedTags.length > 0 && (
          <Tooltip title="Clear all filters">
            <IconButton 
              onClick={handleClearAll}
              size="small"
              sx={{ ml: 1 }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default TagFilter;
