export function localizedField(field: string, alias?: string): string {
  const name = alias ?? field
  // El fallback final nunca puede ser el array internacionalizado crudo: si un
  // editor deja el campo vacío en Studio, la entrada existe sin `value` y React
  // rompe al renderizar el objeto. `[0].value` cubre "solo hay otro idioma" y
  // `string()` cubre el string plano pre-migración (devuelve null para arrays).
  return `"${name}": coalesce(${field}[_key == $lang][0].value, ${field}[_key == "en"][0].value, ${field}[0].value, string(${field}))`
}
