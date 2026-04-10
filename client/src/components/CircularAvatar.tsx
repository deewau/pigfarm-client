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
  progress = 0,
  strokeWidth = 3,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="circular-avatar" style={{ width: size, height: size }}>
      <svg className="circular-avatar__progress" width={size} height={size}>
        {/* Фоновое кольцо */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
        />
        {/* Кольцо прогресса */}
        {progress > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#007aff"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="circular-avatar__ring"
          />
        )}
      </svg>
      {src ? (
        <img src={src} alt={alt} className="circular-avatar__image" />
      ) : (
        <div className="circular-avatar__image circular-avatar__image--placeholder" />
      )}
    </div>
  );
};
