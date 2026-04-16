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

    return svgContent.replace(/id="__lottie_element_/g, `id="${id}_lottie_`);
  }, [svgContent, uniqueId]);

  return (
    <div
      style={{
        width: size,
        height: size,
        color: 'inherit',
      }}
      dangerouslySetInnerHTML={{ __html: processedSvg }}
    />
  );
}
