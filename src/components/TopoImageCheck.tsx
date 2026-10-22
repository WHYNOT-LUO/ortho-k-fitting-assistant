import { useEffect, useRef, useState } from 'react';
import { clinicRules } from '../config/clinicRules';
import { analyzeCentralRed, type CentralRedResult } from '../domain/topoImage';
import { useLang, type MessageKey } from '../i18n';
import { NumberInput } from './Fields';

const MAX_SIDE = 1200; // downscale big screenshots so the pixel count stays quick

type Point = { x: number; y: number };

/**
 * Stretch goal (experimental): upload a post-wear topography map, mark the
 * centre and the scale, and count red pixels in the central 3 mm.
 * The image only lives in this component's memory; it is never stored.
 */
export function TopoImageCheck() {
  const { t } = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [centre, setCentre] = useState<Point | null>(null);
  const [edge, setEdge] = useState<Point | null>(null);
  const [distanceMm, setDistanceMm] = useState<number | null>(4);
  const [result, setResult] = useState<CentralRedResult | null>(null);
  const zone = clinicRules.followUp.centralRed.zoneDiameterMm;

  const pxPerMm = centre && edge && distanceMm ? Math.hypot(edge.x - centre.x, edge.y - centre.y) / distanceMm : null;

  // Draw the image, then the markers and the central-zone circle on top.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (centre && pxPerMm) {
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setResult(analyzeCentralRed({ data: pixels.data, width: canvas.width, height: canvas.height }, centre, pxPerMm));
    } else {
      setResult(null);
    }

    const lw = Math.max(2, canvas.width / 300);
    ctx.lineWidth = lw;
    if (centre) {
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(centre.x - 8 * lw, centre.y);
      ctx.lineTo(centre.x + 8 * lw, centre.y);
      ctx.moveTo(centre.x, centre.y - 8 * lw);
      ctx.lineTo(centre.x, centre.y + 8 * lw);
      ctx.stroke();
    }
    if (centre && edge) {
      ctx.setLineDash([4 * lw, 3 * lw]);
      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(centre.x, centre.y);
      ctx.lineTo(edge.x, edge.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (centre && pxPerMm) {
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.arc(centre.x, centre.y, (zone / 2) * pxPerMm, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = lw / 2;
      ctx.stroke();
    }
  }, [image, centre, edge, pxPerMm, zone]);

  const onFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setCentre(null);
      setEdge(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const p = {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
    if (!centre || edge) {
      setCentre(p);
      setEdge(null);
    } else {
      setEdge(p);
    }
  };

  const off = result?.redCentroidOffsetMm;
  const dir: MessageKey | null = off
    ? Math.abs(off.x) >= Math.abs(off.y)
      ? off.x < 0
        ? 'img.dir.left'
        : 'img.dir.right'
      : off.y < 0
        ? 'img.dir.up'
        : 'img.dir.down'
    : null;

  return (
    <details className="card">
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('img.title')}</summary>
      <p className="small muted">{t('img.intro')}</p>
      <div className="notice level-caution small">{t('img.privacy')}</div>
      <div className="toolbar" style={{ marginBottom: 8 }}>
        <label className="btn">
          {t('img.choose')}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
        </label>
        {image && (
          <>
            <span className="small">{t('img.distance')}</span>
            <div style={{ width: 120 }}>
              <NumberInput value={distanceMm} unit="mm" onChange={setDistanceMm} ariaLabel={t('img.distance')} />
            </div>
            <button
              className="btn btn-sm"
              onClick={() => {
                setCentre(null);
                setEdge(null);
              }}
            >
              {t('img.reset')}
            </button>
          </>
        )}
      </div>

      {image && (
        <>
          <p className="small" style={{ margin: '4px 0' }}>
            {!centre ? t('img.step1') : !edge ? t('img.step2') : pxPerMm ? t('img.scale', { px: pxPerMm.toFixed(1) }) : ''}
          </p>
          <canvas
            ref={canvasRef}
            onClick={onClick}
            style={{ maxWidth: '100%', maxHeight: 520, cursor: 'crosshair', border: '1px solid var(--border)', borderRadius: 8 }}
          />
        </>
      )}

      {result && (
        <div style={{ marginTop: 8 }}>
          <p style={{ margin: '4px 0' }}>
            {t('img.result', {
              zone,
              pct: (result.redFraction * 100).toFixed(1),
              threshold: (result.threshold * 100).toFixed(0),
            })}
          </p>
          <div className={`notice ${result.flagged ? 'level-caution' : 'level-ok'}`}>
            {result.flagged ? t('img.flagged') : t('img.clear')}
            {off && dir && off.distance > 0.1 && (
              <div className="small">{t('img.offset', { dir: t(dir), mm: off.distance.toFixed(1) })}</div>
            )}
          </div>
        </div>
      )}
    </details>
  );
}
