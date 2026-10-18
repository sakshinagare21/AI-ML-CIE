import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export default function RiskDistributionChart({ data, colors }) {
  return (
    <div className="risk-chart-wrap">
      <ResponsiveContainer width="56%" height={215}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={88}
            paddingAngle={4}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [value, "Applications"]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="legend-list">
        {data.map((entry, index) => (
          <div key={entry.name}>
            <span>
              <i style={{ background: colors[index % colors.length] }} />
              {entry.name} risk
            </span>
            <strong>{entry.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
