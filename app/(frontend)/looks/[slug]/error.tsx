'use client'

export default function Error({reset}: {error: Error; reset: () => void}) {
  return (
    <div style={{padding: '4rem 1rem', textAlign: 'center'}}>
      <p>No se pudo cargar el look.</p>
      <button onClick={reset}>Reintentar</button>
    </div>
  )
}
