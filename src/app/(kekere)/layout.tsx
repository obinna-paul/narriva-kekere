export default function KekereLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Kekere-specific theme classes are applied here only — never at the root layout.
  return <div className="bg-kekere-bg text-kekere-ink font-body">{children}</div>;
}
