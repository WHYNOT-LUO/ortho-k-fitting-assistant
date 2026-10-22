import {
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { axialSeries, monthsBetween } from '../domain/followup';
import { EYES, type OrthoKCase } from '../domain/types';
import { useLang } from '../i18n';
import { AXIS_TEXT, EYE_COLORS, GRID_COLOR } from './theme';

ChartJS.register(LineElement, PointElement, LinearScale, Tooltip, Legend);

/** Axial length over time, one line per fitted eye. x = months since the first exam. */
export function AxialChart({ c }: { c: OrthoKCase }) {
  const { t } = useLang();
  const eyes = EYES.filter((e) => c.eyesFitted[e]);
  const series = eyes.map((eye) => ({ eye, points: axialSeries(c, eye) }));
  if (!series.some((s) => s.points.length >= 2)) {
    return <p className="muted small">{t('fu.noChart')}</p>;
  }

  const data = {
    datasets: series.map(({ eye, points }) => ({
      label: t(`eye.${eye}`),
      data: points.map((p) => ({ x: Math.round(monthsBetween(c.examDate, p.date) * 10) / 10, y: p.al, date: p.date })),
      borderColor: EYE_COLORS[eye],
      backgroundColor: EYE_COLORS[eye],
      borderWidth: 2,
      pointRadius: 4.5,
      pointHoverRadius: 6,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      tension: 0,
      clip: 8,
    })),
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    // Room so the first/last markers are not clipped at the plot edge.
    layout: { padding: { left: 4, right: 10, top: 4 } },
    animation: { duration: 300 },
    plugins: {
      legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, color: AXIS_TEXT } },
      tooltip: {
        callbacks: {
          title: (items) => (items[0]?.raw as { date: string } | undefined)?.date ?? '',
          label: (item) => `${item.dataset.label}: ${(item.parsed.y ?? 0).toFixed(2)} mm`,
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: t('fu.chartX'), color: AXIS_TEXT },
        grid: { color: GRID_COLOR },
        ticks: { color: AXIS_TEXT, stepSize: 3 },
        border: { display: false },
      },
      y: {
        title: { display: true, text: t('fu.chartY'), color: AXIS_TEXT },
        grid: { color: GRID_COLOR },
        ticks: { color: AXIS_TEXT, callback: (v) => Number(v).toFixed(2) },
        border: { display: false },
        grace: '5%',
      },
    },
  };

  return (
    <div style={{ height: 280 }} role="img" aria-label={t('fu.chartTitle')}>
      <Line data={data} options={options} />
    </div>
  );
}
