export const formatMMK = (value: number): string => {
  const n = typeof value === 'number' && isFinite(value) ? value : 0;
  return `Ks ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
};
