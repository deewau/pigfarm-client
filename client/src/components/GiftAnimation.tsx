import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

interface GiftAnimationProps {
  animationData: any;
  size?: number;
}

export function GiftAnimation({ animationData, size = 80 }: GiftAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !animationData) return;

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animationData,
    });

    return () => {
      animation.destroy();
    };
  }, [animationData]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size }}
    />
  );
}
