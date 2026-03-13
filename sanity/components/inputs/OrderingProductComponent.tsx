import React from 'react'
import {DragDropContext, Draggable, Droppable, type DropResult} from 'react-beautiful-dnd'

type OrderableProduct = {
  _id: string
  title?: string
  order?: number
  [key: string]: unknown
}

type Props = {
  value?: OrderableProduct[]
  onChange: (items: OrderableProduct[]) => void
}

const reorder = (
  list: OrderableProduct[],
  startIndex: number,
  endIndex: number
): OrderableProduct[] => {
  const result = [...list]
  const [removed] = result.splice(startIndex, 1)
  if (!removed) return result
  result.splice(endIndex, 0, removed)
  return result
}

const OrderingProductComponent = ({value = [], onChange}: Props) => {
  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = reorder(value, result.source.index, result.destination.index)
    const updatedItems = items.map((product, index) => ({
      ...product,
      order: index + 1,
    }))

    onChange(updatedItems)
  }

  return (
    <DragDropContext onDragEnd={handleOnDragEnd}>
      <Droppable droppableId="products">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {value.map((product, index) => (
              <Draggable key={product._id} draggableId={product._id} index={index}>
                {(dragProvided) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    {product.title}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}

export default OrderingProductComponent
