export default function NarrivaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Narriva-specific theme classes are applied here only — never at the root layout.
  return <div className="bg-narriva-bg text-narriva-ink font-body">{children}</div>;
}
