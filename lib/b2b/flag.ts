// Feature flag del B2B. Off por defecto (seguro en producción hasta el lanzamiento).
// Activar con B2B_ENABLED=true en el entorno (dev/staging, y producción al lanzar).
export const B2B_ENABLED = process.env.B2B_ENABLED === 'true'
