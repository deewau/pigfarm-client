import { useMemo } from 'react';

interface GiftImageProps {
  svgContent: string;
  size?: number;
  uniqueId?: string;
}

export function GiftImage({ svgContent, size = 80, uniqueId }: GiftImageProps) {
  const processedSvg = useMemo(() => {
    if (!svgContent) return svgContent;

    const id = uniqueId || Math.random().toString(36).substring(2, 9);

    const svg = svgContent.replace(/__lottie_element_/g, `${id}_lottie_`);
    
    return svg;
  }, [svgContent, uniqueId]);

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
