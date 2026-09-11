import type { ReactNode } from 'react';

interface FieldProps {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  rows?: number;
  options?: Array<{ value: string; label: string }>;
  full?: boolean;
  min?: number;
  max?: number;
  hidden?: boolean;
}

export function Field({ label, value, onChange, type = 'text', rows, options, full, min, max, hidden }: FieldProps) {
  if (hidden) return null;

  const control = options ? (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  ) : rows ? (
    <textarea rows={rows} value={value} spellCheck={false} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input type={type} value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)} />
  );

  return (
    <label className={full ? 'full' : undefined}>
      {label}
      {control}
    </label>
  );
}
