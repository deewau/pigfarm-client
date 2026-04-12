interface GiftImageProps {
  svgContent: string;
  size?: number;
}

export function GiftImage({ svgContent, size = 80 }: GiftImageProps) {
  return (
    <div
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
