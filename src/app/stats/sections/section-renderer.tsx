"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type {
  RegistrationStatsViewChart,
  RegistrationStatsViewPayload,
} from "@/server/registration-stats/service";

type StatsSectionRendererProps = {
  actions?: ReactNode;
  description: string;
  payload: RegistrationStatsViewPayload;
  title: string;
};

const CHART_COLORS = [
  "#2772a0",
  "#009e60",
  "#f97316",
  "#bc2c1a",
  "#f5d000",
  "#4f46e5",
] as const;

const NUMBER_FORMATTER = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const toLabel = (value: string) =>
  value
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatCardValue = ({
  unit,
  value,
}: {
  unit: string;
  value: number | string;
}) => {
  if (typeof value === "string") {
    return value;
  }

  if (unit.toLowerCase().includes("percent")) {
    return `${NUMBER_FORMATTER.format(value)}%`;
  }

  return NUMBER_FORMATTER.format(value);
};

const formatCellValue = ({
  column,
  value,
}: {
  column: string;
  value: number | string | null;
}) => {
  if (value === null || value === "") {
    return "—";
  }

  if (typeof value === "number") {
    if (column.toLowerCase().includes("percent")) {
      return `${NUMBER_FORMATTER.format(value)}%`;
    }
    return NUMBER_FORMATTER.format(value);
  }

  return value;
};

const isChartEmpty = (chart: RegistrationStatsViewChart) =>
  chart.labels.length === 0 ||
  chart.series.length === 0 ||
  chart.series.every((serie) => serie.data.length === 0);

const buildCartesianData = (chart: RegistrationStatsViewChart) =>
  chart.labels.map((label, index) => {
    const row: Record<string, number | string> = {
      label,
      shortLabel: chart.labels.length > 6 ? `#${index + 1}` : label,
    };

    for (const serie of chart.series) {
      row[serie.key] = Number(serie.data[index] ?? 0);
    }
    return row;
  });

const renderDonutChart = (chart: RegistrationStatsViewChart) => {
  const series = chart.series[0];
  const data = chart.labels.map((label, index) => ({
    label: toLabel(label),
    value: Number(series?.data[index] ?? 0),
  }));

  return (
    <>
      <ChartLegend
        className="mb-3"
        items={data.map((entry, index) => ({
          color: CHART_COLORS[index % CHART_COLORS.length] as string,
          label: entry.label,
        }))}
      />
      <ChartContainer className="h-[320px]">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie
            data={data}
            dataKey="value"
            innerRadius={66}
            nameKey="label"
            outerRadius={110}
          >
            {data.map((entry, index) => (
              <Cell
                key={`${entry.label}-${entry.value}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    </>
  );
};

const renderBarChart = (chart: RegistrationStatsViewChart) => {
  const data = buildCartesianData(chart);
  return (
    <>
      <ChartLegend
        className="mb-3"
        items={chart.series.map((serie, index) => ({
          color: CHART_COLORS[index % CHART_COLORS.length] as string,
          label: serie.label,
        }))}
      />
      <ChartContainer className="h-[320px]">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="shortLabel" />
          <YAxis allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  `Label: ${payload?.[0]?.payload.label ?? ""}`
                }
              />
            }
          />
          <Legend />
          {chart.series.map((serie, index) => (
            <Bar
              key={serie.key}
              dataKey={serie.key}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              name={serie.label}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </>
  );
};

const renderLineChart = (chart: RegistrationStatsViewChart) => {
  const data = buildCartesianData(chart);
  return (
    <>
      <ChartLegend
        className="mb-3"
        items={chart.series.map((serie, index) => ({
          color: CHART_COLORS[index % CHART_COLORS.length] as string,
          label: serie.label,
        }))}
      />
      <ChartContainer className="h-[320px]">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="shortLabel" />
          <YAxis allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  `Label: ${payload?.[0]?.payload.label ?? ""}`
                }
              />
            }
          />
          <Legend />
          {chart.series.map((serie, index) => (
            <Line
              key={serie.key}
              dataKey={serie.key}
              dot={false}
              name={serie.label}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={2.5}
              type="monotone"
            />
          ))}
        </LineChart>
      </ChartContainer>
    </>
  );
};

const renderComposedChart = (chart: RegistrationStatsViewChart) => {
  const data = buildCartesianData(chart);
  const [barSeries, ...lineSeries] = chart.series;

  return (
    <>
      <ChartLegend
        className="mb-3"
        items={chart.series.map((serie, index) => ({
          color: CHART_COLORS[index % CHART_COLORS.length] as string,
          label: serie.label,
        }))}
      />
      <ChartContainer className="h-[320px]">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="label"
            angle={-35}
            height={62}
            interval={0}
            textAnchor="end"
            tick={{ fontSize: 11 }}
          />
          <YAxis allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label) => `Date: ${String(label)}`}
              />
            }
          />
          <Legend />
          {barSeries ? (
            <Bar
              dataKey={barSeries.key}
              fill={CHART_COLORS[0]}
              name={barSeries.label}
              radius={[4, 4, 0, 0]}
            />
          ) : null}
          {lineSeries.map((serie, index) => (
            <Line
              key={serie.key}
              dataKey={serie.key}
              dot={false}
              name={serie.label}
              stroke={CHART_COLORS[(index + 1) % CHART_COLORS.length]}
              strokeWidth={2.5}
              type="monotone"
            />
          ))}
        </ComposedChart>
      </ChartContainer>
    </>
  );
};

const ChartBlock = ({ chart }: { chart: RegistrationStatsViewChart }) => {
  if (isChartEmpty(chart)) {
    return (
      <p className="mt-4 text-sm font-medium text-foreground/70">
        No chart data available yet.
      </p>
    );
  }

  switch (chart.chartType) {
    case "donut":
      return renderDonutChart(chart);
    case "line":
      return renderLineChart(chart);
    case "composed":
      return renderComposedChart(chart);
    default:
      return renderBarChart(chart);
  }
};

const StatsSectionRenderer = ({
  actions,
  description,
  payload,
  title,
}: StatsSectionRendererProps) => (
  <section className="rounded-2xl border border-b-4 border-fnblue/70 bg-linear-to-br from-white via-white to-fnblue/8 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-black uppercase tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-foreground/70">{description}</p>
      </div>
      {actions}
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {payload.cards.map((card) => (
        <article
          key={card.id}
          className="rounded-xl border border-b-4 border-fnblue/70 bg-white px-4 py-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-black text-fnblue">
            {formatCardValue({ unit: card.unit, value: card.value })}
          </p>
        </article>
      ))}
    </div>

    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {payload.charts.map((chart) => (
        <article
          key={chart.id}
          className="rounded-xl border border-foreground/12 bg-white p-4"
        >
          <h3 className="text-sm font-black uppercase tracking-tight text-foreground/80">
            {chart.label}
          </h3>
          <div className="mt-3">
            <ChartBlock chart={chart} />
          </div>
        </article>
      ))}
    </div>

    <article className="mt-6 rounded-xl border border-foreground/12 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-tight text-foreground/80">
          Top Rows
        </h3>
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Showing {payload.table.rows.length} of {payload.table.total} rows
        </p>
      </div>

      {payload.table.rows.length === 0 ? (
        <p className="mt-3 text-sm font-medium text-foreground/70">
          No table data available yet.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr>
                {payload.table.columns.map((column) => (
                  <th
                    key={column}
                    className="border-b border-foreground/10 px-2 py-2 text-xs font-black uppercase tracking-wide text-foreground/60"
                  >
                    {toLabel(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payload.table.rows.map((row) => {
                const rowKey = payload.table.columns
                  .map((column) => String(row[column] ?? ""))
                  .join("|");

                return (
                  <tr key={rowKey}>
                    {payload.table.columns.map((column) => (
                      <td
                        key={`${rowKey}-${column}`}
                        className="border-b border-foreground/8 px-2 py-2 font-medium text-foreground/80"
                      >
                        {formatCellValue({
                          column,
                          value: row[column] !== undefined ? row[column] : null,
                        })}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-foreground/55">
        Sort: {payload.table.sort}
      </p>
    </article>
  </section>
);

export default StatsSectionRenderer;
