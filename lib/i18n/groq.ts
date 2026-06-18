export function localizedField(field: string, alias?: string): string {
  const name = alias ?? field
  return `"${name}": coalesce(${field}[_key == $lang][0].value, ${field}[_key == "en"][0].value, ${field})`
}
