import type { CSSProperties, ReactNode } from "react";
import { initials } from "@/lib/format";
import { Icon, type IconName } from "./Icon";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  index = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  tone?: "brand" | "sun" | "ok" | "info";
  index?: number;
}) {
  return (
    <article className={`stat card rise${tone === "brand" ? "" : ` ${tone}`}`} style={{ "--i": index } as CSSProperties}>
      <span className="stat-ic">
        <Icon name={icon} size={20} />
      </span>
      <p className="stat-label">{label}</p>
      <p className="stat-value num">{value}</p>
      {hint && <p className="stat-hint">{hint}</p>}
    </article>
  );
}

export function EmptyState({ icon = "paw", title, text, children }: { icon?: IconName; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-ic">
        <Icon name={icon} size={26} />
      </span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

const TONES = ["#ba2bd2", "#2563eb", "#0d9488", "#d97706", "#db2777", "#7c3aed", "#15803d"];
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const tone = TONES[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % TONES.length];
  return (
    <span className="avatar" style={{ background: tone, width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function Skeletons({ count, height }: { count: number; height: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" style={{ height }} />
      ))}
    </>
  );
}
