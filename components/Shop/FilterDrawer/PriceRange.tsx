'use client'
import {useState, useEffect} from 'react'

interface Props {
  min?: string
  max?: string
  onChange: (next: {min?: string; max?: string}) => void
}

export default function PriceRange({min, max, onChange}: Props) {
  const [localMin, setLocalMin] = useState(min ?? '')
  const [localMax, setLocalMax] = useState(max ?? '')

  useEffect(() => {
    setLocalMin(min ?? '')
    setLocalMax(max ?? '')
  }, [min, max])

  function commit() {
    onChange({
      min: localMin || undefined,
      max: localMax || undefined,
    })
  }

  return (
    <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
      <label style={{display: 'flex', flexDirection: 'column', fontSize: 11}}>
        Min €
        <input
          type="number"
          value={localMin}
          onChange={(e) => setLocalMin(e.target.value)}
          onBlur={commit}
          style={{width: 80, padding: 6, border: '1px solid #c4c4c4'}}
        />
      </label>
      <label style={{display: 'flex', flexDirection: 'column', fontSize: 11}}>
        Max €
        <input
          type="number"
          value={localMax}
          onChange={(e) => setLocalMax(e.target.value)}
          onBlur={commit}
          style={{width: 80, padding: 6, border: '1px solid #c4c4c4'}}
        />
      </label>
    </div>
  )
}
