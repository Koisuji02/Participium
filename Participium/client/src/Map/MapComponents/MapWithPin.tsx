import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, GeoJSON } from 'react-leaflet';
import L, { LatLng, LatLngBounds } from 'leaflet';
import '../CssMap/MapWithPin.css';
import type { Report } from '../types/report';
// @ts-ignore
import turinData from '../../data/turin_boundaries.json';

const TURIN_COORDINATES: [number, number] = [45.0703, 7.66];

// Get Turin bounds from the actual boundary data
const getTurinBounds = () => {
  const cityBoundary = turinData?.find((item: any) => item.addresstype === 'city');
  if (cityBoundary?.boundingbox) {
    const [minLat, maxLat, minLon, maxLon] = cityBoundary.boundingbox.map(Number);
    return new LatLngBounds(
      [minLat, minLon],  // Southwest corner
      [maxLat, maxLon]   // Northeast corner
    );
  }
};

const TURIN_BOUNDS = getTurinBounds();

// Create mask data to dim area outside Turin
const getTurinMask = () => {
  const cityBoundary = turinData?.find((item: any) => item.addresstype === 'city');
  if (!cityBoundary?.geojson) return null;

  const geo = cityBoundary.geojson;
  
  // Larger bounding box covering area around Turin [Lon, Lat]
  const outerCoords = [
    [6.5, 46.6], // Top Left
    [9.3, 46.6], // Top Right
    [9.3, 44], // Bottom Right
    [6.5, 44], // Bottom Left
    [6.5, 46.6]  // Close the polygon
  ];

  let cityCoords: any[] = [];

  // Extract coordinates based on geometry type
  if (geo.type === 'Polygon') {
    cityCoords = (geo.coordinates as any)[0];
  } else if (geo.type === 'MultiPolygon') {
    // Take the main polygon (first one)
    cityCoords = (geo.coordinates as any)[0][0];
  }

  // Create mask: outer box with Turin boundary as a hole
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [outerCoords, cityCoords]
    }
  };
};

const CATEGORY_COLORS: Record<string, string> = {
    water_supply: '#8b5cf6',
    architectural_barriers: '#10b981',
    public_lighting: '#ef4444',
    waste: '#f59e0b',
    road_signs_and_traffic_lights: '#3b82f6',
    roads_and_urban_furnishings: '#955c51ff',
    public_green_areas_and_playgrounds: '#af589bff',
    other: '#6b7280',
};

const createCustomIcon = (category: string | undefined, status?: 'pending' | 'in-progress' | 'resolved') => {
  let emoji;
  if (status === 'in-progress') {
    emoji = '📌';
  } else if (status === 'resolved') {
    emoji = '✅';
  } else {
    emoji = '📍';
  }
  const color = (category && CATEGORY_COLORS[category]) || '#6b7280';
  const html = `<div class="report-marker" style="background:${color}">${emoji}</div>`;
  return L.divIcon({
    html,
    className: 'report-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Check if a point is within Turin's boundaries
const isPointInTurin = (lat: number, lng: number): boolean => {
  const cityBoundary = turinData?.find((item: any) => item.addresstype === 'city');
  if (!cityBoundary?.geojson) return false;

  const geo = cityBoundary.geojson;

  // Extract coordinates based on geometry type
  if (geo.type === 'Polygon') {
    return isPointInPolygon([lng, lat], geo.coordinates as any);
  } else if (geo.type === 'MultiPolygon') {
    // Check all polygons in the multipolygon
    for (const polygon of geo.coordinates as any) {
      if (isPointInPolygon([lng, lat], polygon)) {
        return true;
      }
    }
    return false;
  }

  return false;
};

// Helper function to check if point is in polygon using ray casting algorithm
const isPointInPolygon = (point: number[], polygon: number[][][]): boolean => {
  const [x, y] = point;
  const ring = polygon[0]; // Use outer ring
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
};

interface MapWithPinProps {
  onLocationSelect: (lat: number, lng: number) => void;
  reports: Report[];
  selectedPosition?: [number, number] | null;
}

function LocationMarker({ 
  onLocationSelect, 
  selectedPosition 
}: { 
  onLocationSelect: (lat: number, lng: number) => void;
  selectedPosition?: [number, number] | null;
}) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [address, setAddress] = useState<string>('Loading address...');
  const markerRef = React.useRef<L.Marker>(null);

  // Sync with external selectedPosition
  useEffect(() => {
    if (selectedPosition) {
      setPosition({ lat: selectedPosition[0], lng: selectedPosition[1] } as LatLng);
      fetchAddress(selectedPosition[0], selectedPosition[1]);
    }
  }, [selectedPosition]);

  // Open popup automatically when marker is created or position changes
  useEffect(() => {
    if (markerRef.current && position) {
      markerRef.current.openPopup();
    }
  }, [position, address]);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      setAddress('Loading address...');
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await response.json();
      
      if (data.address) {
        const street = data.address.road || '';
        const houseNumber = data.address.house_number || '';
        const addressLine = houseNumber && street ? `${street}, ${houseNumber}` : street || data.display_name;
        setAddress(addressLine);
      } else {
        setAddress(data.display_name || 'Address not found');
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      setAddress('Unable to fetch address');
    }
  };

  const map = useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      
      // Check if the point is within Turin boundaries
      if (!isPointInTurin(lat, lng)) {
        L.popup()
          .setLatLng(e.latlng)
          .setContent('<div style="text-align: center; padding: 8px;"><strong>⚠️ Invalid Location</strong><br/>You have to choose a location within the city of Turin</div>')
          .openOn(map);
        return;
      }
      
      setPosition(e.latlng);
      onLocationSelect(lat, lng);
      fetchAddress(lat, lng);
      try {
        localStorage.setItem('pendingReportLocation', JSON.stringify([lat, lng]));
      } catch (err) {
        console.error('Failed to save location to localStorage:', err);
      }
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position} ref={markerRef}>
      <Popup autoClose={false} closeOnClick={false} closeButton={false}>
        <div className="location-popup">
          <strong>📍 Selected Location</strong><br />
          <strong>Address:</strong> {address}<br />
          <strong>Coordinates:</strong> {position.lat.toFixed(6)}, {position.lng.toFixed(6)}<br />
          <em>Fill out the form to complete your report</em>
        </div>
      </Popup>
    </Marker>
  );
}

const MapWithPin: React.FC<MapWithPinProps> = ({ 
  onLocationSelect, 
  reports = [],
  selectedPosition
}) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get the city boundary for rendering
  const cityBoundary = turinData?.find((item: any) => item.addresstype === 'city');
  const maskData = getTurinMask();
  
  const maskStyle = {
    color: 'transparent',
    fillColor: '#001c50',
    fillOpacity: 0.2,
    interactive: false
  };
  
  const boundaryStyle = {
    color: '#0a2c6bff',
    weight: 3,
    opacity: 1,
    fillOpacity: 0,
    interactive: false
  };

  return (
    <div className="map-container">
      <MapContainer
        center={TURIN_COORDINATES}
        zoom={13}
        maxBounds={TURIN_BOUNDS}
        maxBoundsViscosity={1}
        minZoom={13.2}
        maxZoom={20}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {maskData && (
          <GeoJSON 
            key="turin-mask"
            data={maskData as any} 
            style={maskStyle}
          />
        )}
        {cityBoundary && (
          <GeoJSON 
            key={cityBoundary.osm_id} 
            data={cityBoundary.geojson as any} 
            style={boundaryStyle}
          />
        )}
        
        <LocationMarker onLocationSelect={onLocationSelect} selectedPosition={selectedPosition} />
        
        {reports.map((report) => (
          <Marker 
            key={report.id} 
            position={[report.latitude, report.longitude]}
            icon={createCustomIcon(report.category, report.status)}
          >
            <Popup>
              <div className="report-popup">
                <div className="report-popup-header">
                  <h3 className="report-popup-title">{report.title}</h3>
                  <span className={`report-popup-category category-${report.category}`}>
                    {report.category}
                  </span>
                </div>

                <div className="report-popup-status-container">
                  <span className={`report-popup-status status-${report.status.replace('-', '')}`}>
                    {report.status.replace('-', ' ')}
                  </span>
                </div>

                <div className="report-popup-description">
                  <p>{report.description}</p>
                </div>

                {report.photos.length > 0 && (
                  <div className="report-popup-photos">
                    <strong>Photos:</strong>
                    <div className="photos-grid">
                      {report.photos.slice(0, 3).map((photo, index) => (
                        <img
                          key={`${report.id}-${index}`}
                          src={URL.createObjectURL(photo)}
                          alt={`${report.title} - ${index + 1}`}
                          className="photo-thumbnail"
                        />
                      ))}
                    </div>
                    {report.photos.length > 3 && (
                      <div className="photos-count">
                        +{report.photos.length - 3} more photos
                      </div>
                    )}
                  </div>
                  )}


                <div className="report-popup-footer">
                  <div className="popup-location">
                    <strong>Location:</strong> {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                  </div>
                  <div className="popup-date">
                    <strong>Submitted:</strong> {formatDate(report.createdAt)}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="map-overview">
        <strong>🗺️ Map Overview:</strong> 
        <span className="overview-stats">
          {reports.length} report{reports.length === 1 ? '' : 's'} submitted
          {reports.length > 0 && (
            <>
              {' • '}
              <span className="stat-pending">{reports.filter(r => r.status === 'pending').length} pending</span>
              {' • '}
              <span className="stat-in-progress">{reports.filter(r => r.status === 'in-progress').length} in progress</span>
              {' • '}
              <span className="stat-resolved">{reports.filter(r => r.status === 'resolved').length} resolved</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
};

export default MapWithPin;
