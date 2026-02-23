import React, { useState, useEffect, useMemo } from 'react';
import { Paper, IconButton, Autocomplete, CircularProgress, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import throttle from 'lodash/throttle';

interface SearchBarProps {
  setSearch: (search: string | null) => void;
}

interface Address {
  display_name: string;
  address: {
    city?: string;
    town?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export default function SearchBar({ setSearch }: Readonly<SearchBarProps>) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAddresses = useMemo(
    () =>
      throttle(async (query: string, callback: (data: Address[]) => void) => {
        setLoading(true);
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}+Torino&addressdetails=1&limit=5&countrycodes=it`
          );
          const data: Address[] = await response.json();
          callback(data);
        } catch (error) {
          console.error("Error fetching addresses:", error);
        } finally {
          setLoading(false);
        }
      }, 500),
    []
  );

  useEffect(() => {
    if (inputValue.length < 3) {
      setOptions([]);
      return;
    }
    fetchAddresses(inputValue, (results: Address[]) => {
      setOptions(results || []);
    });
  }, [inputValue, fetchAddresses]);

  const handleFinalSearch = (value: string | null) => {
    if (value && value.trim() === '') {
      setSearch(null);
      return;
    }
    if (value) {
      setSearch(value);
    } else {
      setSearch(null);
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        handleFinalSearch(inputValue);
      }}
      sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', margin: '0 1rem 0 1rem', border: '1px solid #ddd' }}
    >
      <Autocomplete
        sx={{ flex: 1 }}
        options={options}
        getOptionLabel={(option) => (typeof option === 'string' ? option : option.display_name)}
        filterOptions={(options) => options.filter(opt =>
          opt.address.city === "Torino" ||
          opt.address.town === "Torino"
        )}
        onInputChange={(_event, newInputValue) => {
          setInputValue(newInputValue);
        }}
        onChange={(_event, newValue) => {
          if (newValue) {
            handleFinalSearch(newValue.display_name);
          } else {
            setSearch(null);
            setInputValue('');
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search address in Turin..."
            variant="standard"
            fullWidth
            slotProps={{
              input: {
                ...params.InputProps,
                disableUnderline: true,
                endAdornment: (
                  <React.Fragment>
                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </React.Fragment>
                ),
              }
            }}
            sx={{ ml: 1, flex: 1 }}
          />
        )}
      />
      <IconButton
        type="submit"
        sx={{ p: '10px' }}
        aria-label="search"
      >
        <SearchIcon />
      </IconButton>
    </Paper>
  );
}