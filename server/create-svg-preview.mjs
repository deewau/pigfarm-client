import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, 'assets', 'gifts50', 'vicecream.json');
const svgPath = path.join(__dirname, 'assets', 'svg', 'vicecream.svg');

if (!fs.existsSync(jsonPath)) {
  console.error('JSON not found:', jsonPath);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

const w = data.w || 512;
const h = data.h || 512;

let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;

function processShape(layer, shapes, transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }) {
  if (!shapes || !Array.isArray(shapes)) return '';
  
  let paths = '';
  
  for (const shape of shapes) {
    if (shape.ty === 'sh' && shape.ks && shape.ks.a === 0) {
      const pathData = shape.ks.it?.[0]?.ks?.k || shape.ks.k;
      if (pathData && pathData.v) {
        const points = pathData.v;
        let d = 'M ';
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const x = (p[0] + transform.x) * transform.scaleX;
          const y = (p[1] + transform.y) * transform.scaleY;
          if (i === 0) {
            d += `${x},${y} `;
          } else {
            const hasI = pathData.i && pathData.i[i];
            const hasO = pathData.o && pathData.o[i];
            if (hasI && hasO) {
              const cp1x = (hasI[0] + transform.x) * transform.scaleX;
              const cp1y = (hasI[1] + transform.y) * transform.scaleY;
              const cp2x = (hasO[0] + transform.x) * transform.scaleX;
              const cp2y = (hasO[1] + transform.y) * transform.scaleY;
              d += `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y} `;
            } else {
              d += `L ${x},${y} `;
            }
          }
        }
        d += 'Z';
        paths += `<path d="${d}" fill="${shape.d || 0}"/>`;
      }
    }
  }
  return paths;
}

if (data.layers) {
  for (const layer of data.layers) {
    if (layer.td) continue;
    
    const px = layer.ks?.p?.k || [0, 0];
    const transform = {
      x: Array.isArray(px) ? px[0] : px,
      y: Array.isArray(px) ? px[1] : (typeof px === 'object' ? px.a === 0 ? px.k[0] : 0 : 0),
      scaleX: layer.ks?.s?.k ? (Array.isArray(layer.ks.s.k) ? layer.ks.s.k[0] / 100 : layer.ks.s.k) : 1,
      scaleY: layer.ks?.s?.k ? (Array.isArray(layer.ks.s.k) ? layer.ks.s.k[1] / 100 : layer.ks.s.k) : 1,
    };
    
    if (layer.shapes) {
      svgContent += processShape(layer, layer.shapes, transform);
    }
  }
}

svgContent += '</svg>';

fs.mkdirSync(path.dirname(svgPath), { recursive: true });
fs.writeFileSync(svgPath, svgContent);

console.log('SVG preview created:', svgPath);