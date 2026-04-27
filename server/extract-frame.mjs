import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, 'assets', 'gifts50', 'vicecream.json');
const svgPath = path.join(__dirname, 'assets', 'svg', 'vicecream.svg');

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const w = data.w || 512;
const h = data.h || 512;

function getValueAtFrame(keyframes, frame) {
  if (!keyframes || keyframes.length === 0) return null;
  if (keyframes.length === 1) return keyframes[0].s || keyframes[0].k;
  
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];
    const t1 = k1.t;
    const t2 = k2.t;
    
    if (frame <= t2) {
      const progress = (frame - t1) / (t2 - t1);
      const ease = 1 - Math.pow(1 - progress, 3);
      
      if (Array.isArray(k1.s) && Array.isArray(k2.s)) {
        return k1.s.map((v, idx) => v + (k2.s[idx] - v) * ease);
      }
      return k1.s + (k2.s - k1.s) * ease;
    }
  }
  return keyframes[keyframes.length - 1].s || keyframes[keyframes.length - 1].k;
}

function extractShape(layer, frame) {
  if (!layer.shapes) return '';
  
  const transform = {
    x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 100
  };
  
  if (layer.ks) {
    const p = layer.ks.p?.k;
    if (Array.isArray(p)) transform.x = p[0], transform.y = p[1];
    else if (typeof p === 'object' && !p.a) transform.x = p.k[0], transform.y = p.k[1];
    
    const s = layer.ks.s?.k;
    if (Array.isArray(s)) transform.scaleX = s[0] / 100, transform.scaleY = s[1] / 100;
    else if (typeof s === 'object' && !s.a) transform.scaleX = s.k[0] / 100, transform.scaleY = s.k[1] / 100;
    
    const r = layer.ks.r?.k;
    if (typeof r === 'number') transform.rotation = r;
    else if (typeof r === 'object' && !r.a) transform.rotation = r.k;
    
    const o = layer.ks.o?.k;
    if (typeof o === 'number') transform.opacity = o;
    else if (typeof o === 'object' && !o.a) transform.opacity = o.k;
  }
  
  if (transform.opacity <= 0) return '';
  
  let shapes = '';
  
  for (const shape of layer.shapes) {
    if (shape.ty === 'gr') {
      shapes += extractShape(shape, frame);
    } else if (shape.ty === 'sh' && shape.ks) {
      const pathData = getValueAtFrame(shape.ks.a ? shape.ks.k : null, frame);
      const staticPath = pathData || (shape.ks.a ? null : shape.ks.k);
      
      if (staticPath && staticPath.v) {
        const points = staticPath.v;
        const inPoints = staticPath.i || points.map(() => [0, 0]);
        const outPoints = staticPath.o || points.map(() => [0, 0]);
        
        let d = 'M ';
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const ix = (p[0] + transform.x) * transform.scaleX;
          const iy = (p[1] + transform.y) * transform.scaleY;
          
          if (i === 0) {
            d += `${ix.toFixed(2)},${iy.toFixed(2)} `;
          } else {
            const cp1x = (inPoints[i][0] + p[0] + transform.x) * transform.scaleX;
            const cp1y = (inPoints[i][1] + p[1] + transform.y) * transform.scaleY;
            const cp2x = (outPoints[i-1][0] + points[i-1][0] + transform.x) * transform.scaleX;
            const cp2y = (outPoints[i-1][1] + points[i-1][1] + transform.y) * transform.scaleY;
            
            d += `C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${ix.toFixed(2)},${iy.toFixed(2)} `;
          }
        }
        d += 'Z';
        
        let fill = '#FF69B4';
        let stroke = 'none';
        let strokeWidth = 0;
        
        for (const style of layer.shapes) {
          if (style.ty === 'fl' && style.ks) {
            const fillVal = getValueAtFrame(style.ks.a ? style.ks.k : null, frame);
            const staticFill = fillVal || (style.ks.a ? null : style.ks.k);
            if (staticFill) {
              if (Array.isArray(staticFill)) {
                fill = `rgb(${Math.round(staticFill[0]*255)},${Math.round(staticFill[1]*255)},${Math.round(staticFill[2]*255)})`;
              } else {
                fill = `rgb(${Math.round(staticFill.r*255)},${Math.round(staticFill.g*255)},${Math.round(staticFill.b*255)})`;
              }
            }
          }
          if (style.ty === 'st' && style.ks) {
            const strokeVal = getValueAtFrame(style.ks.a ? style.ks.k : null, frame);
            const staticStroke = strokeVal || (style.ks.a ? null : style.ks.k);
            if (staticStroke) {
              if (Array.isArray(staticStroke)) {
                stroke = `rgb(${Math.round(staticStroke[0]*255)},${Math.round(staticStroke[1]*255)},${Math.round(staticStroke[2]*255)})`;
              }
            }
            const sw = style.w?.k || style.w;
            if (sw) strokeWidth = sw;
          }
        }
        
        shapes += `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${transform.opacity/100}"/>`;
      }
    } else if (shape.ty === 'el') {
      const cx = transform.x + (shape.ks.p?.k?.[0] || 0);
      const cy = transform.y + (shape.ks.p?.k?.[1] || 0);
      const r = shape.s?.k ? shape.s.k[0] / 2 : 20;
      shapes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FF69B4" opacity="${transform.opacity/100}"/>`;
    } else if (shape.ty === 'rc') {
      const cx = transform.x + (shape.ks.p?.k?.[0] || 0);
      const cy = transform.y + (shape.ks.p?.k?.[1] || 0);
      const rw = shape.s?.k ? shape.s.k[0] : 50;
      const rh = shape.s?.k ? shape.s.k[1] : 50;
      shapes += `<rect x="${cx - rw/2}" y="${cy - rh/2}" width="${rw}" height="${rh}" fill="#FF69B4" opacity="${transform.opacity/100}"/>`;
    }
  }
  
  return shapes;
}

let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;

if (data.layers) {
  const sortedLayers = [...data.layers].filter(l => !l.td && l.ks?.o?.k !== 0);
  
  for (const layer of sortedLayers) {
    svgContent += extractShape(layer, 0);
  }
}

svgContent += '</svg>';

fs.writeFileSync(svgPath, svgContent);
console.log('SVG created at:', svgPath);
console.log('SVG size:', svgContent.length, 'bytes');