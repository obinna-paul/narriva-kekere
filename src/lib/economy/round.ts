/**
 * Rounds to 2 decimal places, matching the Decimal(10,2) cowrie columns.
 * Needed because binary floating-point multiplication (e.g. cowrieCost *
 * 0.7) can land on values like 2.1000000000000005 even when the true
 * result only needs 1 decimal digit.
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
