import {LazyImage} from '@/components/Common'
import type {LookComponentView} from '@/types/look'
import s from './LookSizeList.module.scss'

interface Props {
  components: LookComponentView[]
  selected: (string | undefined)[]
  onSelect: (componentIndex: number, size: string) => void
}

// Shared list of the look's pieces and their selectable sizes (Figma 31-13861):
// each piece has a header (number + thumbnail + title), then full-width size
// rows with the size + price on the left and a Select button flush right.
export default function LookSizeList({components, selected, onSelect}: Props) {
  return (
    <div className={s.list}>
      {components.map((comp, i) => (
        <div key={i} className={s.piece}>
          <div className={s.pieceHeader}>
            <span className={s.pieceIndex}>{i + 1}.</span>
            {comp.imageUrl ? (
              <LazyImage
                src={comp.imageUrl}
                alt={comp.label}
                width={68}
                height={91}
                className={s.pieceThumb}
              />
            ) : (
              <span className={s.pieceThumb} aria-hidden />
            )}
            <span className={s.pieceLabel}>{comp.label}</span>
          </div>

          {comp.sizes.map((opt) => {
            const isSelected = selected[i] === opt.size
            return (
              <div key={opt.variantGid} className={s.sizeRow}>
                <span className={s.sizeName}>{opt.size}</span>
                <span className={s.sizePrice}>€{opt.price.toFixed(2)}</span>
                <button
                  type="button"
                  className={[s.sizeSelect, isSelected ? s.sizeSelectActive : ''].join(' ')}
                  disabled={!opt.availableForSale}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(i, opt.size)}
                >
                  {opt.availableForSale ? (isSelected ? 'Selected' : 'Select') : 'Sold out'}
                </button>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
