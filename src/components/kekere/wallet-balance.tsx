export interface WalletBalanceProps {
  balance: number;
  onTopUpClick?: () => void;
}

export function WalletBalance({ balance, onTopUpClick }: WalletBalanceProps) {
  return (
    <div className="rounded-3xl bg-[var(--color-primary)] p-6 text-center text-[var(--color-bg)]">
      <p className="text-sm font-medium uppercase tracking-wide opacity-80">Your balance</p>
      <p className="mt-2 text-5xl font-bold">{balance.toLocaleString()}</p>
      <p className="mt-1 text-sm opacity-80">cowries</p>
      {onTopUpClick && (
        <button
          type="button"
          onClick={onTopUpClick}
          className="mt-5 rounded-full bg-[var(--color-bg)] px-6 py-2.5 text-sm font-bold text-[var(--color-primary)]"
        >
          Top up
        </button>
      )}
    </div>
  );
}
