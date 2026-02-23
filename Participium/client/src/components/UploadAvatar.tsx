// UploadAvatar.tsx
import React, { useRef } from "react";
import './UploadAvatar.css';

interface UploadAvatarProps {
  onPhotoSelected: (file: File | null) => void;
}

const UploadAvatar: React.FC<UploadAvatarProps> = ({ onPhotoSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onPhotoSelected(file);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleSelect}
      />
      <button
        type="button"
        style={{
          position: "absolute",
          inset: 0,
          cursor: "pointer",
          // Reset default button styles to inherit from div's styling
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          font: 'inherit',
          color: 'inherit',
          textAlign: 'inherit',
          textDecoration: 'none',
          outline: 'none',
          WebkitAppearance: 'none', // For Safari
          MozAppearance: 'none',    // For Firefox
        }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            fileInputRef.current?.click();
          }
        }}
      />
    </>
  );
};

export default UploadAvatar;
