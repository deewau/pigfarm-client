import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

interface GiftAnimationProps {
  url: string;
  size?: number;
}

export function GiftAnimation({ url, size = 80 }: GiftAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: url,
    });

    return () => {
      animation.destroy();
    };
  }, [url]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size }}
    />
  );
}
