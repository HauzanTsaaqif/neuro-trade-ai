'use client';
import { useRef, useEffect, useState, useCallback } from 'react';

interface DataPoint {
  price: number;
  label: string;
}

interface AssetInfo {
  acc: string;
}

interface TooltipState {
  index: number;
  price: number;
  label: string;
  mx: number;
  my: number;
}

interface CanvasWithMeta extends HTMLCanvasElement {
  _meta?: {
    pts: { x: number; y: number }[];
    pad: { t: number; r: number; b: number; l: number };
    data: DataPoint[];
  };
}

function hexToRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function drawChart(
  canvas: CanvasWithMeta | null,
  container: HTMLDivElement | null,
  data: DataPoint[],
  info: AssetInfo,
  tooltip: TooltipState | null,
) {
  if (!canvas || !container || !data.length) return;
  const dpr = window.devicePixelRatio || 1;
  const W = container.clientWidth;
  const H = container.clientHeight;
  if (!W || !H) return;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const pad = { t: 18, r: 14, b: 38, l: 64 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  const priceValues = data.map((d) => d.price);
  const minP = Math.min(...priceValues) * 0.988;
  const maxP = Math.max(...priceValues) * 1.012;
  const rng = maxP - minP;
  const xS = (i: number) => pad.l + (i / (data.length - 1)) * cW;
  const yS = (p: number) => pad.t + cH - ((p - minP) / rng) * cH;

  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i / 4) * cH;
    ctx.strokeStyle = 'rgba(255,255,255,.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
    const p = maxP - (i / 4) * rng;
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.font = '10px Inter,sans-serif';
    ctx.textAlign = 'right';
    const lbl = p >= 1000 ? '$' + (p / 1000).toFixed(1) + 'k' : '$' + p.toFixed(2);
    ctx.fillText(lbl, pad.l - 7, y + 4);
  }

  const pts = data.map((d, i) => ({ x: xS(i), y: yS(d.price) }));

  const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
  grad.addColorStop(0, hexToRgba(info.acc, 0.38));
  grad.addColorStop(0.65, hexToRgba(info.acc, 0.07));
  grad.addColorStop(1, hexToRgba(info.acc, 0));
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2;
    ctx.bezierCurveTo(mx, pts[i - 1].y, mx, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.lineTo(pts[pts.length - 1].x, H - pad.b);
  ctx.lineTo(pts[0].x, H - pad.b);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = hexToRgba(info.acc, 0.55);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2;
    ctx.bezierCurveTo(mx, pts[i - 1].y, mx, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.strokeStyle = info.acc;
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.font = '10px Inter,sans-serif';
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(data.length / 5));
  for (let i = 0; i < data.length; i += step) {
    ctx.fillText(data[i].label, pts[i].x, H - pad.b + 16);
  }

  if (tooltip) {
    const ti = tooltip.index;
    const tx = pts[ti].x;
    const ty = pts[ti].y;
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, pad.t);
    ctx.lineTo(tx, H - pad.b);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(tx, ty, 9, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(info.acc, 0.2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx, ty, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = info.acc;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx, ty, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  canvas._meta = { pts, pad, data };
}

interface Props {
  data: DataPoint[];
  info: AssetInfo;
}

export default function PriceChart({ data, info }: Props) {
  const canvasRef = useRef<CanvasWithMeta>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    setTooltip(null);
    const id = setTimeout(
      () => drawChart(canvasRef.current, containerRef.current, data, info, null),
      14,
    );
    return () => clearTimeout(id);
  }, [data, info]);

  useEffect(() => {
    drawChart(canvasRef.current, containerRef.current, data, info, tooltip);
  }, [tooltip, data, info]);

  const onMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current as CanvasWithMeta;
    if (!canvas || !canvas._meta) return;
    const { pts, pad, data: d } = canvas._meta;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const xRange = pts[pts.length - 1].x - pts[0].x || 1;
    const idx = Math.max(
      0,
      Math.min(d.length - 1, Math.round(((mx - pad.l) / xRange) * (d.length - 1))),
    );
    setTooltip({ index: idx, price: d[idx].price, label: d[idx].label, mx, my });
  }, []);

  const ttLeft = () => {
    if (!tooltip || !containerRef.current) return 0;
    return tooltip.mx > containerRef.current.clientWidth * 0.6 ? tooltip.mx - 132 : tooltip.mx + 16;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
        onMouseMove={onMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 20,
            top: Math.max(8, tooltip.my - 62) + 'px',
            left: ttLeft() + 'px',
            background: 'rgba(8,8,12,.97)',
            border: '1px solid rgba(255,255,255,.11)',
            borderRadius: '12px',
            padding: '8px 13px',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 800,
              color: '#fff',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            $
            {tooltip.price >= 1000
              ? tooltip.price.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : tooltip.price.toFixed(2)}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.38)', marginTop: '2px' }}>
            {tooltip.label}
          </div>
        </div>
      )}
    </div>
  );
}
