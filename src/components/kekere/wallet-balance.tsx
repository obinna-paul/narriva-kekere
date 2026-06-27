export interface WalletBalanceProps {
  balance: number;
  onTopUpClick?: () => void;
}

export function WalletBalance({ balance, onTopUpClick }: WalletBalanceProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] p-6 text-center text-white shadow-lg shadow-[var(--color-primary)]/25">
      <div className="absolute inset-0 bg-kekere-card-texture" aria-hidden="true" />
      <p className="relative text-sm font-medium uppercase tracking-wide opacity-85">Your balance</p>
      <p className="relative mt-2 text-5xl font-bold tabular-nums">{balance.toLocaleString()}</p>
      <p className="relative mt-1 text-sm opacity-85">cowries</p>
      {onTopUpClick && (
        <button
          type="button"
          onClick={onTopUpClick}
          className="relative mt-5 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[var(--color-primary)] transition-transform duration-200 hover:scale-105"
        >
          Top up
        </button>
      )}
    </div>
  );
}
