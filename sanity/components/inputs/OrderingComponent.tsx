import React from 'react'
import {DragDropContext, Draggable, Droppable, type DropResult} from 'react-beautiful-dnd'

type OrderableItem = {
  _id: string
  title?: string
  order?: number
  [key: string]: unknown
}

type Props = {
  value?: OrderableItem[]
  onChange: (items: OrderableItem[]) => void
}

const reorder = (list: OrderableItem[], startIndex: number, endIndex: number): OrderableItem[] => {
  const result = [...list]
  const [removed] = result.splice(startIndex, 1)
  if (!removed) return result
  result.splice(endIndex, 0, removed)
  return result
}

const OrderingComponent = ({value = [], onChange}: Props) => {
  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = reorder(value, result.source.index, result.destination.index)
    const updatedItems = items.map((post, index) => ({
      ...post,
      order: index + 1,
    }))

    onChange(updatedItems)
  }

  return (
    <DragDropContext onDragEnd={handleOnDragEnd}>
      <Droppable droppableId="posts">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {value.map((post, index) => (
              <Draggable key={post._id} draggableId={post._id} index={index}>
                {(dragProvided) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    {post.title}
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

export default OrderingComponent
