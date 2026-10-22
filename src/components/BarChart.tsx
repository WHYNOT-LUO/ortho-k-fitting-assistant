import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip, type ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { AXIS_TEXT, GRID_COLOR, SINGLE_SERIES } from './theme';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

/** One-series bar chart: no legend (the card title names the series). */
export function BarChart({
  labels,
  values,
  xTitle,
  yTitle,
  horizontal,
  ariaLabel,
}: {
  labels: string[];
  values: number[];
  xTitle?: string;
  yTitle?: string;
  horizontal?: boolean;
  ariaLabel: string;
}) {
  const valueAxis = {
    beginAtZero: true,
    ticks: { color: AXIS_TEXT, precision: 0 },
    grid: { color: GRID_COLOR },
    border: { display: false },
    title: { display: Boolean(yTitle), text: yTitle, color: AXIS_TEXT },
  };
  const categoryAxis = {
    ticks: { color: AXIS_TEXT },
    grid: { display: false },
    border: { color: GRID_COLOR },
    title: { display: Boolean(xTitle), text: xTitle, color: AXIS_TEXT },
  };
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    animation: { duration: 300 },
    plugins: { legend: { display: false }, tooltip: { displayColors: false } },
    scales: horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis },
  };
  return (
    <div style={{ height: 220 }} role="img" aria-label={ariaLabel}>
      <Bar
        options={options}
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: SINGLE_SERIES,
              hoverBackgroundColor: '#0b5a73',
              borderRadius: 4,
              borderSkipped: 'start',
              maxBarThickness: 48,
            },
          ],
        }}
      />
    </div>
  );
}
