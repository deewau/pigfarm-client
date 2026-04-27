import { useMemo } from 'react';

interface GiftImageProps {
  svgContent?: string;
  size?: number;
  uniqueId?: string;
  fallbackEmoji?: string;
  giftId?: string;
}

export function GiftImage({ svgContent, size = 80, uniqueId, fallbackEmoji = '🎁', giftId }: GiftImageProps) {
  const processedSvg = useMemo(() => {
    if (!svgContent) return null;

    const id = uniqueId || Math.random().toString(36).substring(2, 9);
    const svg = svgContent.replace(/__lottie_element_/g, `${id}_lottie_`);
    return svg;
  }, [svgContent, uniqueId]);

  if (processedSvg) {
    return (
      <div
        style={{
          width: size,
          height: size,
        }}
        dangerouslySetInnerHTML={{ __html: processedSvg }}
      />
    );
  }

  if (giftId) {
    return (
      <div
        style={{
          width: size,
          height: size,
          backgroundImage: `url(/gifts/svg/${giftId}.svg)`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.6,
      }}
    >
      {fallbackEmoji}
    </div>
  );
}
