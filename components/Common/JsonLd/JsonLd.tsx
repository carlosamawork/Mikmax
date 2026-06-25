// Server component: emits a JSON-LD <script>. Pass one schema object or an array.
// Escapes `<` to avoid breaking out of the <script> tag (XSS-safe).
type Json = Record<string, unknown>

export default function JsonLd({data}: {data: Json | Json[]}) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html: json}} />
}
