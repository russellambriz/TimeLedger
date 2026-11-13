import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '../lib/format';

export type ChartSegment = {
  id: string;
  name: string;
  color: string;
  ms: number;
};

export type ChartBar = {
  key: string;
  label: string;
  total: number;
  mark: boolean;
  segments: ChartSegment[];
};

const PAD_L = 44;
const PAD_R = 10;
const PAD_T = 16;
const PAD_B = 32;

function niceMax(ms: number): number {
  if (ms <= 0) return 30 * 60 * 1000;
  const minutes = ms / 60000;
  const steps = [15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 1440, 2880, 4320, 5760, 8640];
  for (const step of steps) {
    if (minutes <= step) return step * 60000;
  }
  return Math.ceil(minutes / 60 / 12) * 12 * 3600000;
}

function formatAxis(ms: number): string {
  if (ms >= 60 * 60 * 1000) {
    const hours = Math.round((ms / 3600000) * 2) / 2;
    return `${hours}h`;
  }
  return `${Math.round(ms / 60000)}m`;
}

export function StackedChart({
  bars,
  active,
  onActive,
  label,
}: {
  bars: ChartBar[];
  active: number;
  onActive: (index: number) => void;
  label: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const apply = () => setWidth(Math.floor(element.clientWidth));
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const height = width < 520 ? 248 : width < 900 ? 320 : 360;
  const max = niceMax(Math.max(0, ...bars.map((bar) => bar.total)));
  const innerW = Math.max(0, width - PAD_L - PAD_R);
  const innerH = Math.max(0, height - PAD_T - PAD_B);
  const slot = bars.length > 0 ? innerW / bars.length : innerW;
  const barW = Math.max(8, slot * (bars.length <= 7 ? 0.62 : 0.7));
  const baseline = PAD_T + innerH;

  const layout = bars.map((bar, index) => {
    const x = PAD_L + slot * index + (slot - barW) / 2;
    let edge = 0;
    const segs = bar.segments.map((segment, segmentIndex) => {
      const full = max > 0 ? (segment.ms / max) * innerH : 0;
      const gap = segmentIndex > 0 && full > 4 ? 2 : 0;
      const h = Math.max(0, full - gap);
      edge += gap;
      const y = -(edge + h);
      edge += h;
      return { ...segment, y, h, radius: Math.min(5, h / 2) };
    });
    return { x, cx: x + barW / 2, top: baseline - edge, segs };
  });

  const tipIndex = hover ?? (touched ? active : null);
  const tipBar = tipIndex !== null ? bars[tipIndex] : undefined;
  const tipGeom = tipIndex !== null ? layout[tipIndex] : undefined;
  let tipLeft = 8;
  let tipTop = 8;
  if (tipGeom && tipBar) {
    const tipWidth = 200;
    const estimated = 64 + Math.max(1, tipBar.segments.length) * 22;
    tipLeft = Math.max(8, Math.min(tipGeom.cx - tipWidth / 2, Math.max(8, width - tipWidth - 8)));
    tipTop = tipGeom.top - estimated - 10;
    if (tipTop < 8) tipTop = Math.min(tipGeom.top + 16, Math.max(8, height - estimated));
  }

  return (
    <div className="chart-frame" ref={frame} data-testid="chart">
      {width > 0 && (
        <svg width={width} height={height} role="group" aria-label={label}>
          {[1, 0.5].map((fraction) => {
            const y = baseline - innerH * fraction;
            return (
              <g key={fraction}>
                <line x1={PAD_L} x2={width - PAD_R} y1={y} y2={y} stroke="rgba(224,196,150,0.14)" />
                <text x={PAD_L - 8} y={y + 4} textAnchor="end" className="axis">
                  {formatAxis(max * fraction)}
                </text>
              </g>
            );
          })}
          <line x1={PAD_L} x2={width - PAD_R} y1={baseline} y2={baseline} stroke="rgba(224,196,150,0.45)" />
          {bars.map((bar, index) => {
            const geom = layout[index];
            const dim = hover !== null && hover !== index;
            const hitX = -((slot - barW) / 2);
            const tight = bars.length > 7 && slot < 48;
            const stride = tight ? 2 : 1;
            const showLabel =
              stride === 1 ||
              (index === bars.length - 1) ||
              (index % stride === 0 && index < bars.length - stride);
            return (
              <g key={bar.key} transform={`translate(${geom.x} ${baseline})`}>
                {bar.mark && <rect x={hitX} y={-innerH} width={slot} height={innerH} fill="rgba(231,215,190,0.05)" />}
                <g className="stack-rise" opacity={dim ? 0.4 : 1}>
                  {geom.segs.map((segment) => (
                    <rect
                      key={segment.id}
                      x={0}
                      y={segment.y}
                      width={barW}
                      height={Math.max(segment.h, 0)}
                      rx={segment.radius}
                      fill={segment.color}
                    />
                  ))}
                </g>
                <rect
                  className="hit"
                  role="button"
                  tabIndex={0}
                  x={hitX}
                  y={-innerH}
                  width={slot}
                  height={innerH + 26}
                  fill="transparent"
                  aria-label={`${bar.label}, ${formatDuration(bar.total)}`}
                  aria-pressed={active === index}
                  onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse') {
                      setHover(index);
                      onActive(index);
                    }
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === 'mouse') setHover(null);
                  }}
                  onClick={() => {
                    setTouched(true);
                    onActive(index);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setTouched(true);
                      onActive(index);
                    }
                  }}
                />
                {showLabel && (
                  <text
                    x={barW / 2}
                    y={20}
                    textAnchor="middle"
                    className={`axis-label${tight ? ' is-dense' : ''}${bar.mark ? ' is-mark' : ''}`}
                  >
                    {bar.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {tipBar && (
        <div className="tip" style={{ left: tipLeft, top: tipTop }} role="tooltip">
          <div className="tip-label">{tipBar.label}</div>
          <div className="tip-total">{formatDuration(tipBar.total)}</div>
          {tipBar.segments.length === 0 && <div className="tip-empty">No time</div>}
          {tipBar.segments.map((segment) => (
            <div key={segment.id} className="tip-row">
              <span className="dot" style={{ background: segment.color }} />
              <span>{segment.name}</span>
              <span>{formatDuration(segment.ms)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
