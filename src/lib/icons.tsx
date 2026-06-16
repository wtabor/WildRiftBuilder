import type { ReactElement, SVGProps } from "react";
import type { StatKey } from "@/lib/schema";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

/* ── Stat icons (line style, inherit currentColor) ─────────────────────── */

export const SwordIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M14.5 3.5 21 3l-.5 6.5-9 9-6 .5.5-6 9-9Z" /><path d="m13 11-7 7" /><path d="m3 21 3-3" /></svg>
);
export const WandIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M15 4V2m0 8v-2m-3 3H10m10 0h-2M6 18l9-9 3 3-9 9-3-3Z" /><path d="m18.5 8.5-3-3" /></svg>
);
export const GaugeIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 14a6 6 0 1 1 5.2-3" /><path d="m12 14 3-3" /><path d="M5 20a8 8 0 1 1 14 0" /></svg>
);
export const TargetIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></svg>
);
export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /></svg>
);
export const ShieldMagicIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /><path d="M12 8v6m-3-3h6" /></svg>
);
export const HeartIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 20s-7-4.3-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.7 12 20 12 20Z" /></svg>
);
export const DropletIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3s5 5.5 5 9a5 5 0 0 1-10 0c0-3.5 5-9 5-9Z" /></svg>
);
export const BootIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 4h3v9l8 3a3 3 0 0 1 2 3v1H4V4Z" /><path d="M4 17h15" /></svg>
);
export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const PierceIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 21 21 3" /><path d="M14 3h7v7" /><path d="M8 13l3 3" /></svg>
);
export const VampIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3s5 5.5 5 9a5 5 0 0 1-10 0c0-3.5 5-9 5-9Z" /><path d="M9.5 12.5c0 1.4 1.1 2.5 2.5 2.5" /></svg>
);

const STAT_ICON: Partial<Record<StatKey, (p: IconProps) => ReactElement>> = {
  attackDamage: SwordIcon,
  abilityPower: WandIcon,
  attackSpeed: GaugeIcon,
  critChance: TargetIcon,
  critDamage: TargetIcon,
  armor: ShieldIcon,
  magicResist: ShieldMagicIcon,
  maxHealth: HeartIcon,
  healthRegen: HeartIcon,
  mana: DropletIcon,
  manaRegen: DropletIcon,
  moveSpeedFlat: BootIcon,
  moveSpeedPercent: BootIcon,
  abilityHaste: ClockIcon,
  lethality: PierceIcon,
  armorPenPercent: PierceIcon,
  magicPenFlat: PierceIcon,
  magicPenPercent: PierceIcon,
  lifeSteal: VampIcon,
  omnivamp: VampIcon,
  healAndShieldPower: ShieldMagicIcon,
  tenacity: ShieldIcon,
};

export function StatIcon({ statKey, ...props }: { statKey: StatKey } & IconProps) {
  const Cmp = STAT_ICON[statKey] ?? SwordIcon;
  return <Cmp {...props} />;
}

/* ── UI icons ───────────────────────────────────────────────────────────── */

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
);
export const ShareIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="6" cy="12" r="2.5" /><circle cx="17" cy="6" r="2.5" /><circle cx="17" cy="18" r="2.5" /><path d="m8.2 10.8 6.6-3.6M8.2 13.2l6.6 3.6" /></svg>
);
export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m5 13 4 4 10-11" /></svg>
);
export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const XIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13" /></svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m9 6 6 6-6 6" /></svg>
);
export const ArrowUpIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
);
export const ArrowDownIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14m6-6-6 6-6-6" /></svg>
);
export const GoldIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M9 12h6m-3-3v6" /></svg>
);
export const SlidersIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 6h10m4 0h2M4 12h4m4 0h8M4 18h12m4 0h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
);
