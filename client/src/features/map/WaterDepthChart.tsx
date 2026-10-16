import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import type { MonthlyWaterDepth } from './waterDepthSeries.ts'

const Plot = createPlotlyComponent(Plotly)

type WaterDepthChartProps = {
  series: MonthlyWaterDepth[]
  color: string
  traceColor: string
  labelColor: string
}

export function WaterDepthChart({ series, color, traceColor, labelColor }: WaterDepthChartProps) {
  if (series.length === 0) {
    return (
      <p className="rounded-md border border-(--accent)/20 bg-(--accent)/10 px-3 py-4 text-[12px] text-slate-500">
        No readings in the selected period.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-(--accent)/20 bg-(--accent)/10">
      <p
        className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: labelColor }}
      >
        Water depth
      </p>
      <Plot
        data={[
          {
            type: 'scatter',
            mode: 'lines+markers',
            x: series.map((point) => point.date),
            y: series.map((point) => point.depthFt),
            line: { color: traceColor, width: 2, shape: 'spline' },
            marker: { color: traceColor, size: 6 },
            hovertemplate: '%{x|%b %Y}<br>%{y:.1f} ft<extra></extra>',
            name: 'Water depth',
          },
        ]}
        layout={{
          autosize: true,
          height: 200,
          margin: { l: 38, r: 10, t: 8, b: 36 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { family: 'Segoe UI, system-ui, sans-serif', size: 10, color: '#475569' },
          xaxis: {
            type: 'date',
            tickformat: '%b',
            hoverformat: '%b %Y',
            showgrid: false,
            zeroline: false,
            linecolor: '#cbd5e1',
          },
          yaxis: {
            title: { text: 'ft', font: { size: 10 }, standoff: 4 },
            ticksuffix: ' ',
            showgrid: true,
            gridcolor: `${color}1f`,
            zeroline: false,
            linecolor: '#cbd5e1',
          },
          showlegend: false,
        }}
        config={{
          displayModeBar: false,
          responsive: true,
        }}
        style={{ width: '100%', height: 200 }}
        useResizeHandler
      />
    </div>
  )
}
