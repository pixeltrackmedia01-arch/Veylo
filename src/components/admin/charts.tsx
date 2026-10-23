"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Single-series charts: one brand hue (validated for contrast on white), hairline
// grid, 2px line, ~10% area wash, ≤24px bars with 4px rounded data ends.
const SERIES = "var(--brand-primary)";
const GRID = "#e9edf2";
const AXIS = { fontSize: 12, fill: "#5b6779" };

const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: "1px solid #e3e8ef", boxShadow: "0 8px 24px -8px rgb(16 24 40 / 0.18)", fontSize: 13 },
  labelStyle: { color: "#0c1b33", fontWeight: 600 },
  itemStyle: { color: "#0c1b33" },
};

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n));

export function ParticipationChart({ data }: { data: { date: string; verified: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={compact} />
        <Tooltip {...tooltipStyle} cursor={{ stroke: "#c4ccd8", strokeWidth: 1 }} formatter={(v) => [v, "Verified joins"]} />
        <Area type="monotone" dataKey="verified" stroke={SERIES} strokeWidth={2} fill={SERIES} fillOpacity={0.1} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({ data, valueLabel }: { data: { label: string; value: number }[]; valueLabel: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={compact} />
        <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={150} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "rgb(15 159 120 / 0.06)" }} formatter={(v) => [v, valueLabel]} />
        <Bar dataKey="value" fill={SERIES} barSize={20} radius={[0, 4, 4, 0]}>
          <LabelList dataKey="value" position="right" style={{ fontSize: 12, fill: "#0c1b33" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ColumnChart({ data, valueLabel, money }: { data: { label: string; value: number }[]; valueLabel: string; money?: boolean }) {
  const fmt = (v: number) => (money ? `₹${new Intl.NumberFormat("en-IN").format(v)}` : String(v));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 20, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={compact} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "rgb(15 159 120 / 0.06)" }} formatter={(v) => [fmt(Number(v)), valueLabel]} />
        <Bar dataKey="value" fill={SERIES} barSize={24} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
