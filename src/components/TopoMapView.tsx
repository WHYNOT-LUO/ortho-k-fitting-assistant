import { useEffect, useMemo, useRef } from 'react';
import { clinicRules } from '../config/clinicRules';
import { analyzeCentralRed } from '../domain/topoImage';
import {
  MAP_RADIUS_MM,
  SCALE_COLORS,
  SCALE_MIN,
  SCALE_STEP,
  corneaModel,
  postWearPower,
  preFitPower,
  renderMap,
  visitTreatment,
  type CorneaModel,
} from '../domain/topoMap';
import type { Eye, OrthoKCase, Visit } from '../domain/types';
import { useLang, type MessageKey } from '../i18n';

const LEGEND_W = 46;
const TOP_H = 22;
const BOTTOM_H = 18;

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

/**
 * A SIMULATED axial curvature map drawn from the case numbers
 * (see domain/topoMap.ts). Pre-fit when `visit` is omitted, post-wear otherwise.
 */
export function TopoMapView({ c, eye, visit, size = 220 }: { c: OrthoKCase; eye: Eye; visit?: Visit; size?: number }) {
  const { t } = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const model = useMemo(() => corneaModel(c.eyes[eye]), [c, eye]);
  const treatment = useMemo(() => (visit ? visitTreatment(c, eye, visit) : null), [c, eye, visit]);
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;

  const rendered = useMemo(() => {
    if (!model || (visit && !treatment)) return null;
    const power = treatment ? postWearPower(model, treatment) : preFitPower(model);
    return renderMap(power, Math.round(size * dpr));
  }, [model, treatment, visit, size, dpr]);

  const check = useMemo(
    () => (rendered && treatment ? analyzeCentralRed(rendered, rendered.centre, rendered.pxPerMm) : null),
    [rendered, treatment],
  );

  const title = visit ? t('map.postTitle', { date: visit.date }) : t('map.preTitle');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rendered || !model) return;
    const w = size + LEGEND_W + 8;
    const h = TOP_H + size + BOTTOM_H;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Map pixels (device resolution) via an off-screen canvas.
    const off = document.createElement('canvas');
    off.width = rendered.width;
    off.height = rendered.height;
    off.getContext('2d')!.putImageData(new ImageData(rendered.data, rendered.width, rendered.height), 0, 0);
    ctx.drawImage(off, 0, TOP_H, size, size);

    const cx = size / 2;
    const cy = TOP_H + size / 2;
    const pxPerMm = size / (2 * MAP_RADIUS_MM);

    // Zone rings at 3, 5, 7 mm (the topography reference zones).
    ctx.font = '9px -apple-system, "PingFang SC", sans-serif';
    for (const zone of [3, 5, 7]) {
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = zone === clinicRules.followUp.centralRed.zoneDiameterMm ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)';
      ctx.lineWidth = zone === 3 ? 1.4 : 1;
      ctx.arc(cx, cy, (zone / 2) * pxPerMm, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(`${zone}`, cx + (zone / 2) * pxPerMm * 0.72 + 2, cy - (zone / 2) * pxPerMm * 0.72 - 2);
    }

    if (!treatment) {
      // Steep meridian (TABO angle: 0° at 3 o'clock, counter-clockwise).
      const a = ((model as CorneaModel).k2Axis * Math.PI) / 180;
      const r = MAP_RADIUS_MM * pxPerMm;
      ctx.beginPath();
      ctx.setLineDash([5, 3]);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.moveTo(cx - Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(a) * r, cy - Math.sin(a) * r);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Treatment-zone centre.
      const tx = cx + treatment.offsetMm.x * pxPerMm;
      const ty = cy + treatment.offsetMm.y * pxPerMm;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx - 6, ty);
      ctx.lineTo(tx + 6, ty);
      ctx.moveTo(tx, ty - 6);
      ctx.lineTo(tx, ty + 6);
      ctx.stroke();
    }

    // Corneal centre.
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy);
    ctx.lineTo(cx + 4, cy);
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx, cy + 4);
    ctx.stroke();

    // Temporal / nasal sides as the examiner sees them.
    ctx.fillStyle = '#5d6d78';
    ctx.font = '10px -apple-system, "PingFang SC", sans-serif';
    const left = eye === 'OD' ? t('map.temporal') : t('map.nasal');
    const right = eye === 'OD' ? t('map.nasal') : t('map.temporal');
    ctx.textAlign = 'left';
    ctx.fillText(left, 2, TOP_H + 12);
    ctx.textAlign = 'right';
    ctx.fillText(right, size - 2, TOP_H + 12);

    // Title and watermark.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1c2a33';
    ctx.font = '600 11px -apple-system, "PingFang SC", sans-serif';
    ctx.fillText(`${eye} · ${title}`, 0, 14);
    ctx.fillStyle = '#9a6200';
    ctx.font = '10px -apple-system, "PingFang SC", sans-serif';
    ctx.fillText(t('map.simulated'), 0, TOP_H + size + 13, w);

    // Colour legend: 49 D at the top, 37 D at the bottom.
    const lx = size + 10;
    const bar = 12;
    const cell = size / SCALE_COLORS.length;
    SCALE_COLORS.forEach((colour, i) => {
      ctx.fillStyle = colour;
      ctx.fillRect(lx, TOP_H + size - (i + 1) * cell, bar, cell + 0.5);
    });
    ctx.fillStyle = '#1c2a33';
    ctx.font = '9px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i <= SCALE_COLORS.length; i += 4) {
      const d = SCALE_MIN + i * SCALE_STEP;
      ctx.fillText(`${d}`, lx + bar + 3, TOP_H + size - i * cell + 3);
    }
    ctx.fillText('D', lx, TOP_H - 6);
  }, [rendered, model, treatment, size, dpr, eye, title, t]);

  if (!model || !rendered) return <p className="small muted">{t('map.none')}</p>;

  const fileName = `${c.id}-${eye}-${visit ? `post-${visit.date}` : 'pre'}-SIMULATED.png`;
  const assumed = model.assumed.map((a) => t(`map.assumed.${a}` as MessageKey));

  return (
    <figure style={{ margin: 0 }}>
      <canvas ref={canvasRef} role="img" aria-label={`${eye} ${title}. ${t('map.simulated')}`} style={{ maxWidth: '100%' }} />
      <figcaption className="small muted" style={{ maxWidth: size + LEGEND_W + 8 }}>
        {t('map.basis', {
          source: t(`map.src.${model.source}` as MessageKey),
          k1: model.k1.toFixed(2),
          a1: Math.round(model.k1Axis),
          k2: model.k2.toFixed(2),
          a2: Math.round(model.k2Axis),
          e: model.e.toFixed(2),
        })}
        {assumed.length > 0 && <span style={{ color: 'var(--caution)' }}> · {assumed.join(' · ')}</span>}
        {treatment && (
          <div>
            {t('map.treatment', { amount: treatment.amountD.toFixed(2) })} ·{' '}
            {treatment.offsetMm.x || treatment.offsetMm.y
              ? t('map.offset', { mm: Math.hypot(treatment.offsetMm.x, treatment.offsetMm.y).toFixed(1) })
              : t('map.centred')}
          </div>
        )}
        {check && (
          <div>
            {t('map.check', { pct: (check.redFraction * 100).toFixed(1) })} →{' '}
            <span className={`badge ${check.flagged ? 'level-caution' : 'level-ok'}`}>
              {check.flagged ? t('map.checkFlag') : t('map.checkOk')}
            </span>
          </div>
        )}
        <div>
          <button
            type="button"
            className="btn btn-sm no-print"
            style={{ marginTop: 4 }}
            onClick={() => canvasRef.current && downloadCanvas(canvasRef.current, fileName)}
          >
            {t('map.download')}
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
