"use client";

import { type ReactNode, useMemo, useState } from "react";
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

type TableRow = RegistrationStatsViewPayload["table"]["rows"][number];
type ChartLabelMode = NonNullable<RegistrationStatsViewChart["xAxisLabelMode"]>;
type TableSortDirection = "asc" | "desc";
type TableSortState = {
  column: string | null;
  direction: TableSortDirection;
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
const TABLE_LIMIT_OPTIONS = [10, 20, 50, 100] as const;

const IST_DATE_AXIS_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  timeZone: "Asia/Kolkata",
});

const IST_DATE_TOOLTIP_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  timeZone: "Asia/Kolkata",
  year: "numeric",
});

const IST_HOUR_BUCKET_AXIS_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  hour: "numeric",
  hour12: true,
  month: "short",
  timeZone: "Asia/Kolkata",
});

const IST_HOUR_BUCKET_TOOLTIP_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  hour: "numeric",
  hour12: true,
  minute: "2-digit",
  month: "short",
  timeZone: "Asia/Kolkata",
  year: "numeric",
});

const IST_HOUR_OF_DAY_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  hour12: true,
  timeZone: "Asia/Kolkata",
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

const toCsvCell = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized = String(value);
  if (
    normalized.includes(",") ||
    normalized.includes('"') ||
    normalized.includes("\n")
  ) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
};

const toCsv = ({ columns, rows }: { columns: string[]; rows: TableRow[] }) => {
  const header = columns.map(toCsvCell).join(",");
  const dataRows = rows.map((row) =>
    columns.map((column) => toCsvCell(row[column])).join(","),
  );
  return [header, ...dataRows].join("\n");
};

const toSearchableCellValue = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().toLowerCase();
};

const compareTableValues = ({
  direction,
  left,
  right,
}: {
  direction: TableSortDirection;
  left: number | string | null | undefined;
  right: number | string | null | undefined;
}) => {
  const order = direction === "asc" ? 1 : -1;
  const normalizedLeft = left === "" || left === undefined ? null : left;
  const normalizedRight = right === "" || right === undefined ? null : right;

  if (normalizedLeft === null && normalizedRight === null) {
    return 0;
  }
  if (normalizedLeft === null) {
    return 1;
  }
  if (normalizedRight === null) {
    return -1;
  }

  if (
    typeof normalizedLeft === "number" &&
    typeof normalizedRight === "number"
  ) {
    return order * (normalizedLeft - normalizedRight);
  }

  return (
    order *
    String(normalizedLeft).localeCompare(String(normalizedRight), undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
};

const isChartEmpty = ({
  chart,
  series,
}: {
  chart: RegistrationStatsViewChart;
  series: RegistrationStatsViewChart["series"];
}) =>
  chart.labels.length === 0 ||
  series.length === 0 ||
  series.every((serie) => serie.data.length === 0);

const toDateFromIsoLabel = (label: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    return null;
  }

  const parsed = new Date(`${label}T00:00:00+05:30`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const toDateFromHourBucketLabel = (label: string) => {
  const match = label.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):00$/);
  if (!match) {
    return null;
  }

  const [, datePart, hourPart] = match;
  const parsed = new Date(`${datePart}T${hourPart}:00:00+05:30`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const toDateFromHourOfDayLabel = (label: string) => {
  if (!/^\d{2}$/.test(label)) {
    return null;
  }

  const parsed = new Date(`1970-01-01T${label}:00:00+05:30`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const formatChartLabel = ({
  label,
  mode,
  variant,
}: {
  label: string;
  mode: ChartLabelMode;
  variant: "axis" | "tooltip";
}) => {
  if (mode === "default") {
    return label;
  }

  if (mode === "date") {
    const parsed = toDateFromIsoLabel(label);
    if (!parsed) {
      return label;
    }
    return variant === "axis"
      ? IST_DATE_AXIS_FORMATTER.format(parsed)
      : IST_DATE_TOOLTIP_FORMATTER.format(parsed);
  }

  if (mode === "hour_bucket") {
    const parsed = toDateFromHourBucketLabel(label);
    if (!parsed) {
      return label;
    }
    return variant === "axis"
      ? IST_HOUR_BUCKET_AXIS_FORMATTER.format(parsed)
      : IST_HOUR_BUCKET_TOOLTIP_FORMATTER.format(parsed);
  }

  const parsed = toDateFromHourOfDayLabel(label);
  if (!parsed) {
    return label;
  }

  return IST_HOUR_OF_DAY_FORMATTER.format(parsed);
};

const buildCartesianData = ({
  chart,
  series,
}: {
  chart: RegistrationStatsViewChart;
  series: RegistrationStatsViewChart["series"];
}) =>
  chart.labels.map((label, index) => {
    const axisLabelMode = chart.xAxisLabelMode ?? "default";
    const tooltipLabelMode = chart.tooltipLabelMode ?? axisLabelMode;
    const row: Record<string, number | string> = {
      label,
      tooltipLabel: formatChartLabel({
        label,
        mode: tooltipLabelMode,
        variant: "tooltip",
      }),
      xAxisLabel: formatChartLabel({
        label,
        mode: axisLabelMode,
        variant: "axis",
      }),
    };

    for (const serie of series) {
      row[serie.key] = Number(serie.data[index] ?? 0);
    }
    return row;
  });

const renderDonutChart = ({
  chart,
  series,
}: {
  chart: RegistrationStatsViewChart;
  series: RegistrationStatsViewChart["series"];
}) => {
  const firstSeries = series[0];
  const data = chart.labels.map((label, index) => ({
    label: toLabel(label),
    value: Number(firstSeries?.data[index] ?? 0),
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

const renderBarChart = ({
  chart,
  series,
}: {
  chart: RegistrationStatsViewChart;
  series: RegistrationStatsViewChart["series"];
}) => {
  const data = buildCartesianData({ chart, series });
  return (
    <>
      <ChartLegend
        className="mb-3"
        items={series.map((serie, index) => ({
          color: CHART_COLORS[index % CHART_COLORS.length] as string,
          label: serie.label,
        }))}
      />
      <ChartContainer className="h-[320px]">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="xAxisLabel"
            interval="preserveStartEnd"
            minTickGap={24}
            tick={{ fontSize: 11 }}
          />
          <YAxis allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  String(payload?.[0]?.payload.tooltipLabel ?? "")
                }
              />
            }
          />
          <Legend />
          {series.map((serie, index) => (
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

const renderLineChart = ({
  chart,
  series,
}: {
  chart: RegistrationStatsViewChart;
  series: RegistrationStatsViewChart["series"];
}) => {
  const data = buildCartesianData({ chart, series });
  return (
    <>
      <ChartLegend
        className="mb-3"
        items={series.map((serie, index) => ({
          color: CHART_COLORS[index % CHART_COLORS.length] as string,
          label: serie.label,
        }))}
      />
      <ChartContainer className="h-[320px]">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="xAxisLabel"
            interval="preserveStartEnd"
            minTickGap={24}
            tick={{ fontSize: 11 }}
          />
          <YAxis allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  String(payload?.[0]?.payload.tooltipLabel ?? "")
                }
              />
            }
          />
          <Legend />
          {series.map((serie, index) => (
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

const renderComposedChart = ({
  chart,
  series,
}: {
  chart: RegistrationStatsViewChart;
  series: RegistrationStatsViewChart["series"];
}) => {
  const data = buildCartesianData({ chart, series });
  const [barSeries, ...lineSeries] = series;

  return (
    <>
      <ChartLegend
        className="mb-3"
        items={series.map((serie, index) => ({
          color: CHART_COLORS[index % CHART_COLORS.length] as string,
          label: serie.label,
        }))}
      />
      <ChartContainer className="h-[320px]">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="xAxisLabel"
            interval="preserveStartEnd"
            minTickGap={24}
            tick={{ fontSize: 11 }}
          />
          <YAxis allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  String(payload?.[0]?.payload.tooltipLabel ?? "")
                }
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
  const canToggleSeries =
    chart.chartType !== "donut" && chart.series.length > 1;
  const [hiddenSeriesKeys, setHiddenSeriesKeys] = useState<string[]>([]);
  const visibleSeries = useMemo(
    () => chart.series.filter((serie) => !hiddenSeriesKeys.includes(serie.key)),
    [chart.series, hiddenSeriesKeys],
  );

  const allSeriesHidden = visibleSeries.length === 0 && chart.series.length > 0;

  const toggleSeriesVisibility = (seriesKey: string) => {
    setHiddenSeriesKeys((previous) =>
      previous.includes(seriesKey)
        ? previous.filter((key) => key !== seriesKey)
        : [...previous, seriesKey],
    );
  };

  if (allSeriesHidden) {
    return (
      <div className="space-y-3">
        {canToggleSeries ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-foreground/60">
              Metrics
            </span>
            {chart.series.map((serie, index) => {
              const isVisible = !hiddenSeriesKeys.includes(serie.key);
              return (
                <button
                  key={serie.key}
                  type="button"
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition",
                    isVisible
                      ? "border-fnblue/40 bg-fnblue/10 text-fnblue"
                      : "border-foreground/20 bg-white text-foreground/65",
                  ].join(" ")}
                  onClick={() => toggleSeriesVisibility(serie.key)}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor:
                        CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  {serie.label}
                </button>
              );
            })}
          </div>
        ) : null}
        <p className="text-sm font-medium text-foreground/70">
          All chart metrics are hidden. Re-enable at least one metric.
        </p>
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-md border border-fnblue/50 bg-fnblue/10 px-3 text-xs font-bold uppercase tracking-wide text-fnblue hover:bg-fnblue hover:text-white"
          onClick={() => setHiddenSeriesKeys([])}
        >
          Show All Metrics
        </button>
      </div>
    );
  }

  if (isChartEmpty({ chart, series: visibleSeries })) {
    return (
      <p className="mt-4 text-sm font-medium text-foreground/70">
        No chart data available yet.
      </p>
    );
  }

  const renderedChart =
    chart.chartType === "donut"
      ? renderDonutChart({ chart, series: visibleSeries })
      : chart.chartType === "line"
        ? renderLineChart({ chart, series: visibleSeries })
        : chart.chartType === "composed"
          ? renderComposedChart({ chart, series: visibleSeries })
          : renderBarChart({ chart, series: visibleSeries });

  return (
    <div className="space-y-3">
      {canToggleSeries ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-foreground/60">
            Metrics
          </span>
          {chart.series.map((serie, index) => {
            const isVisible = !hiddenSeriesKeys.includes(serie.key);
            return (
              <button
                key={serie.key}
                type="button"
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition",
                  isVisible
                    ? "border-fnblue/40 bg-fnblue/10 text-fnblue"
                    : "border-foreground/20 bg-white text-foreground/65",
                ].join(" ")}
                onClick={() => toggleSeriesVisibility(serie.key)}
              >
                <span
                  className="size-2 rounded-full"
                  style={{
                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
                {serie.label}
              </button>
            );
          })}
          {hiddenSeriesKeys.length > 0 ? (
            <button
              type="button"
              className="inline-flex h-7 items-center rounded-md border border-fnblue/40 px-2 text-[11px] font-bold uppercase tracking-wide text-fnblue hover:bg-fnblue/10"
              onClick={() => setHiddenSeriesKeys([])}
            >
              Show All
            </button>
          ) : null}
        </div>
      ) : null}
      {renderedChart}
    </div>
  );
};

const StatsSectionRenderer = ({
  actions,
  description,
  payload,
  title,
}: StatsSectionRendererProps) => {
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [tableSort, setTableSort] = useState<TableSortState>({
    column: null,
    direction: "asc",
  });
  const [tableRowLimit, setTableRowLimit] = useState(
    Math.max(1, payload.table.limit),
  );

  const normalizedSearchQuery = tableSearchQuery.trim().toLowerCase();
  const tableLimitOptions = useMemo(() => {
    const options = [...TABLE_LIMIT_OPTIONS, payload.table.limit]
      .filter((value) => value > 0)
      .sort((left, right) => left - right);
    return [...new Set(options)];
  }, [payload.table.limit]);

  const filteredRows = useMemo(() => {
    if (!normalizedSearchQuery) {
      return payload.table.rows;
    }

    return payload.table.rows.filter((row) =>
      payload.table.columns.some((column) =>
        toSearchableCellValue(row[column]).includes(normalizedSearchQuery),
      ),
    );
  }, [normalizedSearchQuery, payload.table.columns, payload.table.rows]);

  const sortedRows = useMemo(() => {
    if (!tableSort.column) {
      return filteredRows;
    }

    return [...filteredRows].sort((leftRow, rightRow) =>
      compareTableValues({
        direction: tableSort.direction,
        left: leftRow[tableSort.column as string],
        right: rightRow[tableSort.column as string],
      }),
    );
  }, [filteredRows, tableSort.column, tableSort.direction]);

  const visibleRows = useMemo(
    () => sortedRows.slice(0, Math.max(1, tableRowLimit)),
    [sortedRows, tableRowLimit],
  );

  const onSortColumn = (column: string) => {
    setTableSort((previous) => {
      if (previous.column !== column) {
        return { column, direction: "asc" };
      }

      if (previous.direction === "asc") {
        return { column, direction: "desc" };
      }

      return { column: null, direction: "asc" };
    });
  };

  const getSortIndicator = (column: string) => {
    if (tableSort.column !== column) {
      return "↕";
    }

    return tableSort.direction === "asc" ? "▲" : "▼";
  };

  const resetTableControls = () => {
    setTableSearchQuery("");
    setTableSort({ column: null, direction: "asc" });
    setTableRowLimit(Math.max(1, payload.table.limit));
  };

  const downloadInteractiveTableCsv = () => {
    if (typeof window === "undefined") {
      return;
    }

    const csv = toCsv({
      columns: payload.table.columns,
      rows: sortedRows,
    });
    const blob = new Blob([csv], { type: "text/csv; charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `foundathon-${title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}-interactive-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  };

  return (
    <section className="rounded-2xl border border-b-4 border-fnblue/70 bg-linear-to-br from-white via-white to-fnblue/8 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight">
            {title}
          </h2>
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
            Showing {visibleRows.length} of {sortedRows.length} matched rows
          </p>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <label className="flex flex-col gap-1 text-[11px] font-black uppercase tracking-wide text-foreground/60">
            Search Rows
            <input
              className="h-9 rounded-md border border-foreground/15 bg-background px-2 text-sm font-medium text-foreground"
              onChange={(event) => setTableSearchQuery(event.target.value)}
              placeholder="Search any column value"
              type="search"
              value={tableSearchQuery}
            />
          </label>

          <label className="flex flex-col gap-1 text-[11px] font-black uppercase tracking-wide text-foreground/60">
            Row Limit
            <select
              className="h-9 rounded-md border border-foreground/15 bg-background px-2 text-sm font-medium text-foreground"
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                if (Number.isFinite(parsed) && parsed > 0) {
                  setTableRowLimit(parsed);
                }
              }}
              value={tableRowLimit}
            >
              {tableLimitOptions.map((option) => (
                <option key={option} value={option}>
                  {option} rows
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="inline-flex h-9 items-center justify-center self-end rounded-md border border-fnblue/50 bg-fnblue/10 px-3 text-xs font-bold uppercase tracking-wide text-fnblue hover:bg-fnblue hover:text-white"
            onClick={downloadInteractiveTableCsv}
          >
            Download Matched CSV
          </button>

          <button
            type="button"
            className="inline-flex h-9 items-center justify-center self-end rounded-md border border-foreground/20 px-3 text-xs font-bold uppercase tracking-wide text-foreground/70 hover:border-fnblue/35 hover:text-fnblue"
            onClick={resetTableControls}
          >
            Reset Table
          </button>
        </div>

        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-foreground/55">
          Base sort: {payload.table.sort}
        </p>

        {visibleRows.length === 0 ? (
          <p className="mt-3 text-sm font-medium text-foreground/70">
            No table data available for the current table controls.
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
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-fnblue"
                        onClick={() => onSortColumn(column)}
                      >
                        {toLabel(column)}
                        <span className="text-[10px]" aria-hidden="true">
                          {getSortIndicator(column)}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, rowIndex) => {
                  const rowKey = `${rowIndex}-${payload.table.columns
                    .map((column) => String(row[column] ?? ""))
                    .join("|")}`;

                  return (
                    <tr key={rowKey}>
                      {payload.table.columns.map((column) => (
                        <td
                          key={`${rowKey}-${column}`}
                          className="border-b border-foreground/8 px-2 py-2 font-medium text-foreground/80"
                        >
                          {formatCellValue({
                            column,
                            value:
                              row[column] !== undefined ? row[column] : null,
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
      </article>
    </section>
  );
};

export default StatsSectionRenderer;
