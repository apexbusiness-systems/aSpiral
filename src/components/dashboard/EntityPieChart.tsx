import { TrendingUp } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { EntityTypeData } from "@/types/dashboard";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

interface EntityPieChartProps {
  data: EntityTypeData[];
}

export const EntityPieChart = ({ data }: EntityPieChartProps) => {
  return (
    <div className="glass-card p-6">
      <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        Entity Types
      </h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[250px] text-muted-foreground">
          No entity data yet
        </div>
      )}
      {data.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4 justify-center">
          {data.map((type, index) => (
            <div key={type.name} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-muted-foreground">{type.name}: {type.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
