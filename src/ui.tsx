import { assetUrl } from "./assets";
import type { ReactNode } from "react";
import { ArrowLeft, Minus, Plus, Dumbbell } from "lucide-react";
export function Back({
  onClick,
  label = "Back",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button className="back text-button" onClick={onClick}>
      <ArrowLeft size={19} />
      {label}
    </button>
  );
}
export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </header>
  );
}
export function ExerciseImage({
  src,
  name,
  large = false,
}: {
  src: string;
  name: string;
  large?: boolean;
}) {
  return (
    <div className={`exercise-image ${large ? "large" : ""}`}>
      <img
        key={src}
        src={assetUrl(src)}
        alt={`${name} movement illustration`}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <Dumbbell className="image-fallback" size={32} />
    </div>
  );
}
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 100,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div className="stepper">
      <button
        aria-label={`Decrease ${label}`}
        disabled={disabled || value <= min}
        onClick={() =>
          onChange(Math.max(min, Number((value - step).toFixed(3))))
        }
      >
        <Minus size={18} />
      </button>
      <span>
        <b>{value}</b>
        <small>{label}</small>
      </span>
      <button
        aria-label={`Increase ${label}`}
        disabled={disabled || value >= max}
        onClick={() =>
          onChange(Math.min(max, Number((value + step).toFixed(3))))
        }
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
