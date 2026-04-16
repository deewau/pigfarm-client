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

    let svg = svgContent.replace(/id="__lottie_element_/g, `id="${id}_lottie_`);
    
    svg = svg.replace(/style="[^"]*"/g, '');
    
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
