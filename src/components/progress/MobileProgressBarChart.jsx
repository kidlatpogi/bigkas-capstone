import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function MobileProgressBarChart({ chartData }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} ticks={[1, 2, 3, 4, 5]} domain={[1, 5]} />
        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={20}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={Number.isFinite(entry.value) ? '#10b981' : '#e2e8f0'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
