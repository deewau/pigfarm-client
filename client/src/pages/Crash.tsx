import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Crash.css';

export function Crash() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.scale(dpr, dpr);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;

    const padL = 48;
    const padB = 30;
    const padT = 20;
    const padR = 16;
    const graphW = cw - padL - padR;
    const graphH = ch - padT - padB;
    const originX = padL;
    const originY = ch - padB;

    ctx.clearRect(0, 0, cw, ch);

    function drawGrid() {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.font = '10px Gilroy, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let v = 0; v <= 10; v += 0.5) {
        const yPos = originY - (v / 10) * graphH;
        ctx.beginPath();
        ctx.moveTo(padL, yPos);
        ctx.lineTo(cw - padR, yPos);
        ctx.stroke();
        ctx.fillText(v.toFixed(1), padL - 6, yPos);
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let v = 0; v <= 10; v += 0.5) {
        const xPos = originX + (v / 10) * graphW;
        ctx.beginPath();
        ctx.moveTo(xPos, originY);
        ctx.lineTo(xPos, padT);
        ctx.stroke();
        ctx.fillText(v.toFixed(1), xPos, originY + 4);
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padL, padT);
      ctx.lineTo(padL, originY);
      ctx.lineTo(cw - padR, originY);
      ctx.stroke();
    }

    drawGrid();
  }, []);

  return (
    <div className="crash">
      <button className="back-btn" onClick={() => navigate('/play')}>← Назад</button>
      <div className="crash__game-area">
        <canvas ref={canvasRef} className="crash__canvas" />
      </div>
      <button className="crash__bet-btn">Сделать ставку</button>
    </div>
  );
}
