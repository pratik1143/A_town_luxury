import React, { useEffect, useRef } from 'react';
// @ts-ignore — JsBarcode has no default TS declarations but works fine
import JsBarcode from 'jsbarcode';

interface Code128BarcodeProps {
  value: string;
  width?: string;
  height?: string;
  showText?: boolean;
}

export const Code128Barcode: React.FC<Code128BarcodeProps> = ({
  value,
  width = '100%',
  height = 'auto',
  showText = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Only keep printable ASCII characters (Code 128 range)
  const cleanValue = (value || '').replace(/[^\x20-\x7E]/g, '').trim();

  useEffect(() => {
    if (!svgRef.current || !cleanValue) return;

    try {
      JsBarcode(svgRef.current, cleanValue, {
        format: 'CODE128',
        displayValue: showText,
        fontSize: 10,
        fontOptions: 'bold',
        font: 'monospace',
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: 1,
        lineColor: '#000000',
        background: '#ffffff',
        // Quiet zone — minimum 8 modules each side
        margin: 8,
        // width = X dimension in pixels per module.
        // For short numeric codes (<=8 chars), use thick 4px modules (~0.5mm) for instant scan speed.
        // For longer SKUs, fallback to 2px modules so it fits the label width without overflow.
        width: cleanValue.length <= 8 ? 4 : 2,
        // height of bars in pixels
        height: 60,
        valid: () => {},
      });

      // After rendering, let the SVG scale to fill its container width
      // while locking the height so bars don't get squished.
      const svg = svgRef.current;
      if (svg) {
        // Remove fixed pixel width/height attributes so CSS can control sizing
        svg.removeAttribute('width');
        svg.removeAttribute('height');
      }
    } catch (err) {
      console.error('JsBarcode render error:', err);
    }
  }, [cleanValue, showText]);

  if (!cleanValue) return null;

  return (
    <svg
      ref={svgRef}
      style={{
        display: 'block',
        width: width,
        height: height,
        background: 'white',
        shapeRendering: 'crispEdges',
        overflow: 'visible',
      }}
    />
  );
};

export default Code128Barcode;
