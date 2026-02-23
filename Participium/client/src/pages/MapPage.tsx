import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import MapClusterView, { isPointInTurin } from '../Map/MapComponents/MapClusterView';
import type { Report } from '../Map/types/report';
import { Box, List, ListItem, Paper, Typography, Chip, CircularProgress, Button } from '@mui/material';
import { getAllReports } from '../Map/mapApi/mapApi';
import { getRole, getToken, getUserFromToken } from '../services/auth';
import SearchBar from '../components/SearchBar';
import { followReport, getFollowedReports, unfollowReport } from '../API/API';
import './MapPage.css';

const getCategoryColor = (cat: string): string => {
  switch (cat) {
    case 'water_supply': return '#8b5cf6';
    case 'architectural_barriers': return '#10b981';
    case 'public_lighting': return '#ef4444';
    case 'waste': return '#f59e0b';
    case 'road_signs_and_traffic_lights': return '#3b82f6';
    case 'roads_and_urban_furnishings': return '#955c51ff';
    case 'public_green_areas_and_playgrounds': return '#af589bff';
    default: return '#6b7280';
  }
};

const formatString = (str: string): string => {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const MapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialCenter, setInitialCenter] = useState<[number, number] | null>(null);
  const [initialZoom, setInitialZoom] = useState<number | null>(null);
  const [highlightLocation, setHighlightLocation] = useState<[number, number] | null>(null);
  const [search, setSearch] = useState<string | null>(null);
  const [searchCoords, setSearchCoords] = useState<[number, number] | null>(null);
  const [followedReports, setFollowedReports] = useState<Report[]>([]);

  const logged = getToken() !== null;

  const username = getUserFromToken(getToken())?.username;

  async function follow(id: string) {
    await followReport(id)
    const followedReports = await getFollowedReports();
    setFollowedReports(followedReports);
  }

  async function unfollow(id: string) {
    await unfollowReport(id)
    const followedReports = await getFollowedReports();
    setFollowedReports(followedReports);
  }

  useEffect(() => {
    // Check for lat/lng parameters from report details
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const reportId = searchParams.get('reportId');

    if (lat && lng) {
      const latitude = Number.parseFloat(lat);
      const longitude = Number.parseFloat(lng);
      if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
        setInitialCenter([latitude, longitude]);
        setInitialZoom(17);
        setHighlightLocation([latitude, longitude]);
        if (reportId) {
          setSelectedId(reportId);
        }
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const data = await getAllReports();
        const roles = getRole();
        if (roles?.includes('citizen')) {
          const followedData = await getFollowedReports();
          setFollowedReports(followedData);
        }

        let visibleReports = data.filter(report => {
          const status = report.status?.toLowerCase();
          return status === 'assigned' || status === 'in_progress' || status === 'suspended';
        });

        const reportIdParam = searchParams.get('id');
        if (reportIdParam) {
          const specificReport = data.find(r => r.id === reportIdParam);
          if (specificReport && !visibleReports.some(r => r.id === reportIdParam)) {
            visibleReports = [...visibleReports, specificReport];
          }
          setSelectedId(reportIdParam);
        }

        setReports(visibleReports);
      } catch (error) {
        console.error(error);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [searchParams]);

  useEffect(() => {
    if (!search || search.trim() === '') {
      setSearchCoords(null);
      return;
    }

    const geocodeAddress = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`
        );
        const data = await response.json();
        if (data && data.length > 0) {
          const coords: [number, number] = [Number.parseFloat(data[0].lat), Number.parseFloat(data[0].lon)];
          if (isPointInTurin(coords[0], coords[1])) {
            setSearchCoords(coords);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };

    geocodeAddress();
  }, [search]);

  const filteredReports = useMemo(() => {
    if (search === "") {
      return reports;
    }

    if (!searchCoords) return reports;

    const RADIUS_KM = 0.3;

    return reports.filter((r) => {
      const dx = (r.longitude - searchCoords[1]) * 111.32 * Math.cos(searchCoords[0] * (Math.PI / 180));
      const dy = (r.latitude - searchCoords[0]) * 111.13;
      const distance = Math.hypot(dx, dy);
      return distance <= RADIUS_KM;
    });
  }, [reports, searchCoords]);

  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const zoom = searchParams.get('zoom');

    if (lat && lng) {
      const location: [number, number] = [Number.parseFloat(lat), Number.parseFloat(lng)];
      setInitialCenter(location);
      setInitialZoom(zoom ? Number.parseInt(zoom) : 16);
      setHighlightLocation(location);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 0, alignItems: 'stretch', flexDirection: { xs: 'column', md: 'row' }, width: '100%', height: 'calc(100vh - 64px)' }} className="map-page-container">
      <Box sx={{ flex: { xs: '0 0 100%', md: '0 0 66.666%' }, minWidth: 0 }} className="map-box">
        <MapClusterView
          reports={filteredReports}
          selectedId={selectedId}
          initialCenter={initialCenter}
          initialZoom={initialZoom}
          highlightLocation={highlightLocation}
          searchCoords={searchCoords}
        />
      </Box>

      <Paper sx={{
        flex: { xs: '0 0 100%', md: '0 0 33.333%' },
        minWidth: { xs: '100%', md: 280 },
        height: 'calc(100vh - 64px)',
        overflow: 'auto',
        p: 2,
        bgcolor: '#f8f9fa'
      }} className="report-list" elevation={2}>
        <>
          <Typography variant="h6" gutterBottom>
            {searchCoords ? `Reports near location: ${filteredReports.length}` : `Reports on map (${reports.length})`}
          </Typography>

          {!highlightLocation && <SearchBar setSearch={setSearch} />}
          <List>
            {filteredReports.map((r) => {
              const status = r.status?.toLowerCase();
              const isInProgress = status === 'in_progress' || status === 'in-progress';
              const isAssigned = status === 'assigned';
              const isSuspended = status === 'suspended';
              let cardBgColor = 'white';
              let cardBorder = 'none';

              if (isInProgress) {
                cardBgColor = '#e3f2fd';
                cardBorder = '4px solid #1976d2';
              } else if (isSuspended) {
                cardBgColor = '#fff3e0';
                cardBorder = '4px solid #f57c00';
              } else if (isAssigned) {
                cardBgColor = '#ffe4e0';
                cardBorder = '4px solid #ff6363';
              }

              let authorName = 'Unknown';

              if (r.anonymity) {
                authorName = 'Anonymous';
              } else if (r.author) {
                const { firstName, lastName } = r.author;

                const fullName = `${firstName || ''} ${lastName || ''}`.trim();

                if (fullName) {
                  authorName = fullName;
                }
              }

              return (
                <ListItem key={r.id} disablePadding sx={{ mb: 1 }}>
                  <Paper
                    sx={{
                      width: '100%',
                      p: 1.25,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      bgcolor: cardBgColor,
                      borderLeft: cardBorder,
                      '&:hover': { bgcolor: '#f0f0f0' }
                    }}
                    elevation={1}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ lineHeight: 1.2, mb: 0.5 }}>{r.title}</Typography>

                      <Typography variant="caption" color="text.secondary">
                        {authorName}
                        {` • ${new Date(r.createdAt).toLocaleDateString()}`}
                        {` • ID: #${r.id}`}
                      </Typography>
                      
                      {(logged && r.author?.username != username && getRole()?.includes('citizen') && (
                        <>
                          {!followedReports.some(report => report.id == r.id) && <Button variant='contained' sx={{ marginLeft: 2 }} onClick={() => follow(r.id)}>Follow</Button>}
                          {followedReports.some(report => report.id == r.id) && <Button variant='outlined' sx={{ marginLeft: 2 }} onClick={() => unfollow(r.id)}>Unfollow</Button>}
                        </>
                      ))
                      }
                    </Box>
                    <Chip label={formatString(r.category)} size="small" sx={{ backgroundColor: getCategoryColor(r.category), color: 'white' }} />
                  </Paper>
                </ListItem>
              );
            })}
          </List>
        </>
      </Paper>
    </Box>
  );
};

export default MapPage;