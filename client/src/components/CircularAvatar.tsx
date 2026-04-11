import type { FC } from 'react';
import './CircularAvatar.css';

interface CircularAvatarProps {
  src?: string;
  alt: string;
  size?: number;
  progress?: number; // 0-100
  strokeWidth?: number;
}

export const CircularAvatar: FC<CircularAvatarProps> = ({
  src,
  alt,
  size = 56,
}) => {
  return (
    <div className="circular-avatar" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={alt} className="circular-avatar__image" />
      ) : (
        <div className="circular-avatar__image circular-avatar__image--placeholder" />
      )}
    </div>
  );
};
