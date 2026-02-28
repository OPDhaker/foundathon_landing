"use client";

import * as React from "react";
import { ResponsiveContainer, Tooltip, type TooltipProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { cn } from "@/lib/utils";

type ChartConfigEntry = {
  color?: string;
  label?: React.ReactNode;
};

export type ChartConfig = Record<string, ChartConfigEntry>;

type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  config?: ChartConfig;
  children: React.ReactNode;
};

const buildChartConfigStyle = (config?: ChartConfig) => {
  if (!config) {
    return undefined;
  }

  const style: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    if (!value.color) {
      continue;
    }
    style[`--color-${key}`] = value.color;
  }

  return style as React.CSSProperties;
};

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  ChartContainerProps
>(({ children, className, config, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("h-[320px] w-full", className)}
    style={{ ...buildChartConfigStyle(config), ...style }}
    {...props}
  >
    <ResponsiveContainer
      height="100%"
      minHeight={220}
      minWidth={280}
      width="100%"
    >
      {children}
    </ResponsiveContainer>
  </div>
));
ChartContainer.displayName = "ChartContainer";

export const ChartTooltip = Tooltip;

type ChartTooltipContentProps = TooltipProps<ValueType, NameType> & {
  className?: string;
};

export const ChartTooltipContent = ({
  active,
  className,
  label,
  labelFormatter,
  payload,
}: ChartTooltipContentProps) => {
  if (!active || !payload?.length) {
    return null;
  }

  const renderedLabel = labelFormatter ? labelFormatter(label, payload) : label;

  return (
    <div
      className={cn(
        "rounded-lg border border-foreground/15 bg-background/95 px-3 py-2 shadow-md backdrop-blur-sm",
        className,
      )}
    >
      {renderedLabel ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
          {renderedLabel}
        </p>
      ) : null}
      <div className="mt-1 space-y-1.5">
        {payload.map((entry) => (
          <div
            key={`${entry.dataKey}-${entry.name}`}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="inline-flex items-center gap-2 text-foreground/80">
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor: entry.color ?? "var(--color-fnblue)",
                }}
              />
              <span className="font-medium">{entry.name}</span>
            </span>
            <span className="font-semibold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

type ChartLegendProps = {
  className?: string;
  items: Array<{ color: string; label: string }>;
};

export const ChartLegend = ({ className, items }: ChartLegendProps) => (
  <div className={cn("flex flex-wrap gap-3", className)}>
    {items.map((item) => (
      <span key={item.label} className="inline-flex items-center gap-2 text-xs">
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        <span className="font-semibold uppercase tracking-wide text-foreground/70">
          {item.label}
        </span>
      </span>
    ))}
  </div>
);
