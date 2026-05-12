// error.tsx
'use client'

export default function ProductError({reset}: {reset: () => void}) {
  return (
    <div style={{padding: 40, textAlign: 'center'}}>
      <h2 style={{fontSize: 13, marginBottom: 10}}>Something went wrong</h2>
      <p style={{fontSize: 11, marginBottom: 20}}>
        We could not load this product. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: '10px 20px',
          background: 'black',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: 11,
        }}
      >
        Retry
      </button>
    </div>
  )
}
