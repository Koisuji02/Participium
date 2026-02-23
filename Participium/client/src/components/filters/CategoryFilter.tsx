import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Chip, Box } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

export type ReportCategory = 
  | 'water_supply' 
  | 'architectural_barriers' 
  | 'public_lighting' 
  | 'waste' 
  | 'road_signs_and_traffic_lights' 
  | 'roads_and_urban_furnishings'
  | 'public_green_areas_and_playgrounds'
  | 'organization'
  | 'other';

export const ALL_CATEGORIES: { value: ReportCategory; label: string; color: string }[] = [
  { value: 'water_supply', label: 'Water Supply - Drinking Water', color: '#8b5cf6' },
  { value: 'architectural_barriers', label: 'Architectural Barriers', color: '#10b981' },
  { value: 'public_lighting', label: 'Public Lighting', color: '#ef4444' },
  { value: 'waste', label: 'Waste', color: '#f59e0b' },
  { value: 'road_signs_and_traffic_lights', label: 'Road Signs and Traffic Lights', color: '#3b82f6' },
  { value: 'roads_and_urban_furnishings', label: 'Roads and Urban Furnishings', color: '#955c51ff' },
  { value: 'public_green_areas_and_playgrounds', label: 'Public Green Areas and Playgrounds', color: '#af589bff' },
  { value: 'organization', label: 'Organization', color: '#79005dff' },
  { value: 'other', label: 'Other', color: '#6b7280' },
];

interface CategoryFilterProps {
  /** Current selected category (null or 'all' means no filter) */
  value: ReportCategory | 'all' | null;
  /** Callback when category changes */
  onChange: (category: ReportCategory | 'all' | null) => void;
  /** Optional: restrict to specific categories (e.g., officer's offices). If not provided, shows all. */
  availableCategories?: ReportCategory[];
  /** Optional: label for the filter */
  label?: string;
  /** Optional: show as chip-based filter instead of dropdown */
  variant?: 'dropdown' | 'chips';
  /** Optional: size */
  size?: 'small' | 'medium';
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  value,
  onChange,
  availableCategories,
  label = 'Category',
  variant = 'dropdown',
  size = 'medium',
}) => {
  // Filter categories if restriction is provided
  const categories = availableCategories
    ? ALL_CATEGORIES.filter(c => availableCategories.includes(c.value))
    : ALL_CATEGORIES;

  const handleChange = (event: SelectChangeEvent<string>) => {
    const val = event.target.value;
    onChange(val === 'all' ? 'all' : (val as ReportCategory));
  };

  const handleChipClick = (category: ReportCategory | 'all') => {
    onChange(category);
  };

  if (variant === 'chips') {
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip
          label="All"
          onClick={() => handleChipClick('all')}
          color={value === 'all' || value === null ? 'primary' : 'default'}
          variant={value === 'all' || value === null ? 'filled' : 'outlined'}
          size={size}
        />
        {categories.map(cat => (
          <Chip
            key={cat.value}
            label={cat.label}
            onClick={() => handleChipClick(cat.value)}
            sx={{
              backgroundColor: value === cat.value ? cat.color : 'transparent',
              color: value === cat.value ? 'white' : 'text.primary',
              borderColor: cat.color,
              fontWeight: value === cat.value ? 'bold' : 'normal',
              '&:hover': {
                backgroundColor: value === cat.value ? cat.color : `${cat.color}20`,
              }
            }}
            variant={value === cat.value ? 'filled' : 'outlined'}
            size={size}
          />
        ))}
      </Box>
    );
  }

  // Dropdown variant
  return (
    <FormControl size={size} sx={{ minWidth: 160 }}>
      <InputLabel id="category-filter-label">{label}</InputLabel>
      <Select
        labelId="category-filter-label"
        id="category-filter"
        value={value || 'all'}
        label={label}
        onChange={handleChange}
      >
        <MenuItem value="all">All Categories</MenuItem>
        {categories.map(cat => (
          <MenuItem key={cat.value} value={cat.value}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: cat.color,
                }}
              />
              {cat.label}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default CategoryFilter;
