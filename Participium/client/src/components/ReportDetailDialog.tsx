import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, IconButton } from '@mui/material';
import type { OfficerReport } from '../services/reportService';

interface Props {
  open: boolean;
  report: OfficerReport | null;
  onClose: () => void;
}

const ReportDetailDialog: React.FC<Props> = ({ open, report, onClose }) => {
  const [openImageIndex, setOpenImageIndex] = useState<number | null>(null);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Report: {report?.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <strong>Category:</strong> {report?.category}
            </Box>
            <Box>
              <strong>Reported by:</strong> {' '}
              {report?.anonymity
                ? 'Anonymous'
                : (() => {
                    if (report?.author) {
                        return `${report.author.firstName || ''} ${report.author.lastName || ''}`.trim();
                    } else {
                        return 'Unknown';
                    }
                })()}
            </Box>
            <Box>
              <strong>Description:</strong> {report?.document?.description || report?.description || 'No description'}
            </Box>

            {report?.document?.photos?.length > 0 && (
              <Box>
                <strong>Photos:</strong>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  {report.document.photos.map((p, idx) => {
                    if (!p || typeof p !== 'string') return null;
                    const apiBase = (import.meta.env.VITE_API_BASE ?? 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/i, '');
                    const src = p.startsWith('http') ? p : `${apiBase}${p}`;
                    return (
                      <Button
                        variant="text"
                        component="button"
                        onClick={() => setOpenImageIndex(idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setOpenImageIndex(idx);
                          }
                        }}
                        key={p} // Use p as key for stability
                        sx={{
                          p: 0, // Remove padding from button
                          minWidth: 0, // Remove minWidth
                          width: 120,
                          height: 90,
                          borderRadius: 6,
                          overflow: 'hidden',
                          border: '1px solid #ddd',
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            backgroundColor: 'transparent', // Prevent default button hover effect
                          },
                        }}
                      >
                        <img
                          src={src}
                          alt={`Report ${idx + 1}`} // Add meaningful alt text
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </Button>
                    );
                  })}
                </Box>
              </Box>
            )}

            <Box>
              <strong>Location:</strong> {report?.location?.Coordinates?.latitude}, {report?.location?.Coordinates?.longitude}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (report?.location?.Coordinates) {
                const { latitude, longitude } = report.location.Coordinates;
                window.open(`/map?lat=${latitude}&lng=${longitude}&zoom=16&id=${report.id}`, '_blank');
              }
            }}
            variant="contained"
            color="primary"
          >
            View on Map
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openImageIndex !== null} onClose={() => setOpenImageIndex(null)} maxWidth="md" fullWidth>
        <DialogContent sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 0, bgcolor: 'black' }}>
          {report?.document?.photos && openImageIndex !== null && (
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: '60vh' }}>
              <IconButton
                onClick={() => setOpenImageIndex(i => (i === null ? null : (i - 1 + report.document!.photos!.length) % report.document!.photos!.length))}
                sx={{ color: 'white', position: 'absolute', left: 8, bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, fontSize: '2rem' }}
              >
                ‹
              </IconButton>

              <img
                src={(import.meta.env.VITE_API_BASE ?? 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/i, '') + report.document.photos[openImageIndex]}
                alt={`full-${openImageIndex}`}
                style={{ maxWidth: '100%', maxHeight: '80vh', margin: '0 auto', display: 'block' }}
              />

              <IconButton
                onClick={() => setOpenImageIndex(i => (i === null ? null : (i + 1) % report.document!.photos!.length))}
                sx={{ color: 'white', position: 'absolute', right: 8, bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, fontSize: '2rem' }}
              >
                ›
              </IconButton>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'black' }}>
          <Button onClick={() => setOpenImageIndex(null)} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReportDetailDialog;
