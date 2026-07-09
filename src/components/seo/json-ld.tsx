/** Renders a schema.org JSON-LD block. Safe to drop anywhere in a server
 * component's JSX — Google reads structured data from anywhere in the
 * document, not just <head>. `data` should come from the builders in
 * src/lib/seo/schema.ts, never raw user input (this uses
 * dangerouslySetInnerHTML with JSON.stringify, which escapes quotes/braces
 * but not `</script>` sequences — fine for our own generated objects, not
 * safe for arbitrary strings). */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
