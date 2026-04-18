"use client"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

const data = [
  { month: "Jan", revenue: 180, expenses: 120 },
  { month: "Feb", revenue: 200, expenses: 140 },
  { month: "Mar", revenue: 220, expenses: 130 },
  { month: "Apr", revenue: 280, expenses: 150 },
  { month: "May", revenue: 340, expenses: 160 },
  { month: "Jun", revenue: 300, expenses: 170 },
  { month: "Jul", revenue: 360, expenses: 180 },
  { month: "Aug", revenue: 400, expenses: 190 },
]

export function RevenueChart() {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Revenue Trends</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Comparative growth over the last 8 months
          </p>
        </div>
        <select className="text-xs border border-border rounded-lg px-3 py-1.5 bg-secondary text-foreground">
          <option>Last 8 months</option>
          <option>Last 6 months</option>
          <option>Last year</option>
        </select>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.25 0.08 260)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.25 0.08 260)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.7 0.18 55)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.7 0.18 55)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 280)" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "oklch(0.5 0.02 260)", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "oklch(0.5 0.02 260)", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(1 0 0)",
                border: "1px solid oklch(0.9 0.01 280)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="oklch(0.25 0.08 260)"
              strokeWidth={2}
              fill="url(#colorRevenue)"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="oklch(0.7 0.18 55)"
              strokeWidth={2}
              fill="url(#colorExpenses)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-navy" />
            <span className="text-xs text-muted-foreground">Net Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Expenses</span>
          </div>
        </div>
        <button className="text-xs text-primary font-medium hover:underline">
          Full Report
        </button>
      </div>
    </div>
  )
}
