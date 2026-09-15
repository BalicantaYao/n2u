"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  className?: string;
}

/** Covered Call 表單共用的小欄位：一行標籤 + 一個輸入框 */
function Field({
  label,
  hint,
  className,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  className,
  step = "any",
  min = "0",
}: FieldProps & { step?: string; min?: string }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} className={className} htmlFor={id}>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9"
      />
    </Field>
  );
}

export function DateField({
  label,
  value,
  onChange,
  hint,
  className,
}: FieldProps) {
  const id = useId();
  return (
    <Field label={label} hint={hint} className={className} htmlFor={id}>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9"
      />
    </Field>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  className,
  maxLength = 200,
}: FieldProps & { maxLength?: number }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} className={className} htmlFor={id}>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="h-9"
      />
    </Field>
  );
}

/** 解析輸入框字串成數字；空字串或非數字回傳 fallback */
export function toNumber(value: string, fallback = NaN): number {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
}
