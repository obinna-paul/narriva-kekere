import { COWRIE_TOPUP_PACKAGES } from "@/content/decisions";
import { cn } from "@/lib/utils/cn";

const ngnFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export interface TopUpSelectorProps {
  selected: number | null;
  onSelect: (index: number) => void;
}

/** Package amounts come straight from COWRIE_TOPUP_PACKAGES — never re-typed here. */
export function TopUpSelector({ selected, onSelect }: TopUpSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {COWRIE_TOPUP_PACKAGES.map((pkg, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className={cn(
            "rounded-2xl border-2 p-4 text-left transition-colors",
            selected === i
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
              : "border-[var(--color-ink)]/10"
          )}
        >
          <p className="text-xl font-bold">{pkg.cowries.toLocaleString()}</p>
          <p className="text-xs text-[var(--color-ink)]/50">cowries</p>
          {pkg.bonusCowries > 0 && (
            <p className="mt-1 text-xs font-medium text-emerald-700">
              +{pkg.bonusCowries} bonus
            </p>
          )}
          <p className="mt-2 text-sm font-semibold text-[var(--color-primary)]">
            {ngnFormatter.format(pkg.priceNGN)}
          </p>
        </button>
      ))}
    </div>
  );
}
