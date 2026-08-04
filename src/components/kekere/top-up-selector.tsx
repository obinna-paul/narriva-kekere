import { COWRIE_TOPUP_PACKAGES } from "@/content/decisions";
import { cn } from "@/lib/utils/cn";

const ngnFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export interface TopUpSelectorProps {
  selected: number | null;
  onSelect: (index: number) => void;
  /** Which price to show — matches whichever checkout the modal is actually
   *  going to run. Defaults to Paystack/NGN for any other caller. */
  provider?: "paystack" | "stripe";
}

/** Package amounts come straight from COWRIE_TOPUP_PACKAGES — never re-typed here. */
export function TopUpSelector({ selected, onSelect, provider = "paystack" }: TopUpSelectorProps) {
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
            {provider === "stripe" ? usdFormatter.format(pkg.priceUSD) : ngnFormatter.format(pkg.priceNGN)}
          </p>
        </button>
      ))}
    </div>
  );
}
