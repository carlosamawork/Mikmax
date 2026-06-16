// Prefijo de número VAT → país ISO-2 declarado. La mayoría coincide con el ISO-2,
// salvo Grecia (EL → GR). Reino Unido usa GB.
export const VAT_PREFIX_TO_COUNTRY: Record<string, string> = {
  AT: 'AT', BE: 'BE', BG: 'BG', CY: 'CY', CZ: 'CZ', DE: 'DE', DK: 'DK',
  EE: 'EE', EL: 'GR', ES: 'ES', FI: 'FI', FR: 'FR', GB: 'GB', HR: 'HR',
  HU: 'HU', IE: 'IE', IT: 'IT', LT: 'LT', LU: 'LU', LV: 'LV', MT: 'MT',
  NL: 'NL', PL: 'PL', PT: 'PT', RO: 'RO', SE: 'SE', SI: 'SI', SK: 'SK',
}
