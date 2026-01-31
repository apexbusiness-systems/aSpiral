import { BarChart3 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DailyStats } from "@/types/dashboard";

interface ActivityChartProps {
  data: DailyStats[];
}

export const ActivityChart = ({ data }: ActivityChartProps) => {
  return (
    <div className="glass-card p-6">
      <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5" />
        Activity (Last 7 Days)
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Area
            type="monotone"
            dataKey="sessions"
            stackId="1"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary) / 0.3)"
            name="Sessions"
          />
          <Area
            type="monotone"
            dataKey="breakthroughs"
            stackId="1"
            stroke="hsl(var(--accent))"
            fill="hsl(var(--accent) / 0.3)"
            name="Breakthroughs"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
