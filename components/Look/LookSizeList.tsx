import {LazyImage} from '@/components/Common'
import type {LookComponentView} from '@/types/look'
import {formatMoney} from '@/lib/money'
import s from './LookSizeList.module.scss'

interface Props {
  components: LookComponentView[]
  selected: (string | undefined)[]
  onSelect: (componentIndex: number, size: string) => void
  currency: string
}

// Shared list of the look's pieces and their selectable sizes. The size rows
// mirror the PDP SizeSelector (44px index rail, #f0f0f0 Select button, selected
// row turns #f7f7f7 with index + button flipped to white). Each piece adds a
// header with the product thumbnail, since a look spans several products.
export default function LookSizeList({components, selected, onSelect, currency}: Props) {
  // Client component: locale flag is OFF in production so 'en' is correct today.
  // Locale-threading is deferred to a later pass.
  const fmt = (n: number) => formatMoney({amount: n, currencyCode: currency}, 'en')

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
              <div
                key={opt.variantGid}
                className={[
                  s.sizeRow,
                  !opt.availableForSale ? s.sizeRowDisabled : '',
                  isSelected ? s.sizeRowSelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className={s.sizeIndex} aria-hidden />
                <span className={s.sizeName}>{opt.size}</span>
                <span className={s.sizePrice}>{fmt(opt.price)}</span>
                <button
                  type="button"
                  className={s.sizeSelect}
                  disabled={!opt.availableForSale}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(i, opt.size)}
                >
                  Select
                </button>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
