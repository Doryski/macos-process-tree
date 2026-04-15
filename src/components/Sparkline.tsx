type SparklineProps = {
  data: readonly number[];
  width?: number;
  height?: number;
  color?: string;
  maxSamples?: number;
};

export function Sparkline({
  data,
  width = 60,
  height = 16,
  color = "#38bdf8",
  maxSamples = 20,
}: SparklineProps) {
  if (data.length < 2) return <div style={{ width, height }} />;

  const max = Math.max(...data, 1);
  const step = width / (maxSamples - 1);

  const points = data
    .map((value, i) => {
      const x = (i + (maxSamples - data.length)) * step;
      const y = height - (value / max) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  // Build area fill path (close polygon at bottom)
  const firstX = (maxSamples - data.length) * step;
  const lastX = (maxSamples - 1) * step;
  const areaPoints = `${points} ${lastX},${height} ${firstX},${height}`;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polygon
        points={areaPoints}
        fill={color}
        fillOpacity={0.08}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.85}
      />
    </svg>
  );
}
