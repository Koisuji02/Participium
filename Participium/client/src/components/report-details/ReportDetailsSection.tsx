import { Stack, Box, Typography, Chip, Paper, Divider, Modal, IconButton, Link } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { static_ip_address } from '../../API/API';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatString } from '../../utils/StringUtils';

interface ReportDetailsSectionProps {
  readonly report: any;
}

export function ReportDetailsSection({ report }: ReportDetailsSectionProps) {
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [addressText, setAddressText] = useState<string>('');

  const handlePhotoClick = (index: number) => {
    setSelectedPhotoIndex(index);
    setOpenModal(true);
  };

  const handleNextPhoto = () => {
    if (report.document?.photos) {
      setSelectedPhotoIndex((prev) => (prev + 1) % report.document.photos.length);
    }
  };

  const handlePrevPhoto = () => {
    if (report.document?.photos) {
      setSelectedPhotoIndex((prev) => (prev - 1 + report.document.photos.length) % report.document.photos.length);
    }
  };

  // Reverse geocoding: convert coordinates to address
  useEffect(() => {
    const lat = report.location?.Coordinates?.latitude;
    const lng = report.location?.Coordinates?.longitude;
    
    if (lat && lng) {
      const fetchAddress = async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          if (data?.display_name) {
            setAddressText(data.display_name);
          } else {
            setAddressText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          setAddressText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      };
      fetchAddress();
    } else if (typeof report.location === 'string') {
      setAddressText(report.location);
    } else {
      setAddressText('Not specified');
    }
  }, [report.location]);

  const currentPhoto = report.document?.photos?.[selectedPhotoIndex];
  const formatDate = (date: string) => {
    if (!date) return 'Not specified';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    const statusMap: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
      'PENDING': 'warning',
      'ASSIGNED': 'info',
      'DECLINED': 'error',
      'IN_PROGRESS': 'primary',
      'SUSPENDED': 'secondary',
      'RESOLVED': 'success'
    };
    return statusMap[status] || 'default';
  };

  if (!report) {
    return <Typography>No report data</Typography>;
  }

  return (
    <Stack spacing={3}>
      {/* Title & Status */}
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Report #{report.id}</Typography>
          <Chip 
            label={report.state || 'PENDING'} 
            color={getStatusColor(report.state || 'PENDING')}
            size="medium"
          />
        </Box>
        <Typography variant="h6" color="text.secondary">{report.title || 'Untitled Report'}</Typography>
      </Box>

      <Divider />

      {/* Metadata Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <LocationOnIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Location
            </Typography>
          </Box>
          <Link
            component="button"
            variant="body2"
            onClick={() => {
              const lat = report.location?.Coordinates?.latitude;
              const lng = report.location?.Coordinates?.longitude;
              if (lat && lng) {
                navigate(`/map?lat=${lat}&lng=${lng}&reportId=${report.id}`);
              } else {
                navigate('/map');
              }
            }}
            sx={{ 
              textAlign: 'left',
              cursor: 'pointer',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            {addressText || 'Loading...'}
          </Link>
        </Box>
        <InfoField 
          icon={<CalendarTodayIcon />}
          label="Reported"
          value={formatDate(report.date || '')}
        />
        <InfoField 
          icon={<CategoryIcon />}
          label="Category"
          value={formatString(report.category) || 'Not specified'}
        />
        <InfoField 
          icon={<PersonIcon />}
          label="Reporter"
          value={report.author?.username || 'Unknown'}
        />
      </Box>

      <Divider />

      {/* Description */}
      <Box>
        <Typography variant="subtitle2" mb={1.5} fontWeight={600}>Description</Typography>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {report.document?.description || 'No description provided'}
          </Typography>
        </Paper>
      </Box>

      {/* Photos */}
      {report.document?.photos && report.document.photos.length > 0 && (
        <>
          <Box>
            <Typography variant="subtitle2" mb={1.5} fontWeight={600}>Photos ({report.document.photos.length})</Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              {report.document.photos.map((photo: string, index: number) => (
                <Box
                  key={photo}
                  component="img"
                  src={static_ip_address + photo}
                  alt={`Report photo ${index + 1}`}
                  sx={{
                    width: 150,
                    height: 150,
                    objectFit: 'cover',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)'
                    }
                  }}
                  onClick={() => handlePhotoClick(index)}
                />
              ))}
            </Box>
          </Box>

          {/* Photo Modal */}
          <Modal
            open={openModal}
            onClose={() => setOpenModal(false)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Box
              sx={{
                position: 'relative',
                bgcolor: 'rgba(0, 0, 0, 0.9)',
                borderRadius: 2,
                maxWidth: '90vw',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2
              }}
            >
              {/* Close Button */}
              <IconButton
                onClick={() => setOpenModal(false)}
                sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  color: 'white',
                  zIndex: 1
                }}
              >
                <CloseIcon />
              </IconButton>

              {/* Main Image */}
              <Box
                component="img"
                src={static_ip_address + currentPhoto}
                alt={`Photo ${selectedPhotoIndex + 1}`}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: 1
                }}
              />

              {/* Navigation Controls */}
              {report.document.photos.length > 1 && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mt: 2,
                    justifyContent: 'center'
                  }}
                >
                  <IconButton
                    onClick={handlePrevPhoto}
                    sx={{ color: 'white' }}
                  >
                    <NavigateBeforeIcon />
                  </IconButton>
                  <Typography sx={{ color: 'white', minWidth: '100px', textAlign: 'center' }}>
                    {selectedPhotoIndex + 1} / {report.document.photos.length}
                  </Typography>
                  <IconButton
                    onClick={handleNextPhoto}
                    sx={{ color: 'white' }}
                  >
                    <NavigateNextIcon />
                  </IconButton>
                </Box>
              )}
            </Box>
          </Modal>
        </>
      )}

      {/* Location Map */}
      {report.location?.coordinates?.latitude && report.location?.coordinates?.longitude && (
        <Box>
          <Typography variant="subtitle2" mb={1.5} fontWeight={600}>Location Map</Typography>
          <Box 
            sx={{ 
              height: 250, 
              borderRadius: 2, 
              overflow: 'hidden',
              bgcolor: 'grey.200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography color="text.secondary">
              Location: {report.location.coordinates.latitude}, {report.location.coordinates.longitude}
            </Typography>
          </Box>
        </Box>
      )}
    </Stack>
  );
}

interface InfoFieldProps {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
}

function InfoField({ icon, label, value }: InfoFieldProps) {
  return (
    <Box display="flex" gap={1}>
      <Box sx={{ color: 'primary.main', mt: 0.5 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body2">{value}</Typography>
      </Box>
    </Box>
  );
}
