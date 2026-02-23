import React, { useRef, useState } from 'react';
import { FaUpload, FaTimes } from 'react-icons/fa';
import '../CssMap/PhotoUpload.css';

interface PhotoUploadProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 3
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // allowed mime types (match server-side acceptance)
  const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // filter only image files and allowed mime types
    const imageFiles = files.filter(file => file.type.startsWith('image/') && ALLOWED_MIME.has(file.type));
    const rejected = files.filter(file => file.type.startsWith('image/') && !ALLOWED_MIME.has(file.type));
    if (rejected.length > 0) {
      alert('Some files were ignored because only JPG, PNG and WebP formats are allowed.');
    }
    
    const remainingSlots = maxPhotos - photos.length;
    const filesToAdd = imageFiles.slice(0, remainingSlots);
    
    if (filesToAdd.length > 0) {
      onPhotosChange([...photos, ...filesToAdd]);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    // Also update drag and drop to use Set
    const imageFiles = files.filter(file => 
      file.type.startsWith('image/') && ALLOWED_MIME_TYPES.has(file.type)
    );
    
    const remainingSlots = maxPhotos - photos.length;
    const filesToAdd = imageFiles.slice(0, remainingSlots);
    
    if (filesToAdd.length > 0) {
      onPhotosChange([...photos, ...filesToAdd]);
    }
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="photo-upload-container">
      <label className="photo-upload-label">
        Photos ({photos.length}/{maxPhotos})
      </label>

      {canAddMore && (
        <button
          type="button"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              fileInputRef.current?.click();
            }
          }}
          className={`upload-area ${isDragOver ? 'upload-area-dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-icon">
            <FaUpload size={24} />
          </div>
          <p className="upload-text">
            Click or drag and drop to upload photos
          </p>
          <p className="upload-hint">
            Minimum 1 photo required, maximum {maxPhotos} photos
          </p>
          <p className="upload-hint-small">
            Allowed formats: JPG, PNG, WebP
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileSelect}
            className="upload-input"
            aria-hidden="true"
            tabIndex={-1}
          />
        </button>
      )}
      
      <div className="photos-grid-preview">
        {photos.map((photo, index) => (
          <div key={`${photo.name}-${photo.lastModified}`} className="photo-preview-item">
            <img
              src={URL.createObjectURL(photo)}
              alt={`Preview`}
              className="photo-preview-image"
            />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              className="photo-remove-btn"
            >
              <FaTimes size={10} />
            </button>
            <div className="photo-file-info">
              {photo.name}
            </div>
          </div>
        ))}
      </div>
      
      {photos.length === 0 && (
        <p className="photo-validation-error">
          At least one photo is required
        </p>
      )}
    </div>
  );
};

export default PhotoUpload;