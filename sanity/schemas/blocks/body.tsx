import {defineField} from 'sanity'
import React from 'react'

const TextBlackIcon = () => (
  <span style={{fontWeight: 600, color: '#000'}}>N</span>
)
const TextGrayIcon = () => (
  <span style={{fontWeight: 600, color: '#969696'}}>G</span>
)

const TextBlackRender = (props: {children: React.ReactNode}) => (
  <span style={{color: '#000'}}>{props.children}</span>
)
const TextGrayRender = (props: {children: React.ReactNode}) => (
  <span style={{color: '#969696'}}>{props.children}</span>
)

export default defineField({
  name: 'body',
  title: 'Body',
  type: 'array',
  of: [
    {
      lists: [
        {title: 'Bullet', value: 'bullet'},
        {title: 'Numbered', value: 'number'},
      ],
      styles: [
        {title: 'Normal', value: 'normal'},
        {title: 'H1', value: 'h1'},
        {title: 'H2', value: 'h2'},
        {title: 'H3', value: 'h3'},
        {title: 'H4', value: 'h4'},
        {title: 'H5', value: 'h5'},
        {title: 'H6', value: 'h6'},
        {title: 'Quote', value: 'blockquote'},
      ],
      marks: {
        decorators: [
          {title: 'Italic', value: 'em'},
          {title: 'Strong', value: 'strong'},
          {
            title: 'Negro',
            value: 'textBlack',
            icon: TextBlackIcon,
            component: TextBlackRender,
          },
          {
            title: 'Gris',
            value: 'textGray',
            icon: TextGrayIcon,
            component: TextGrayRender,
          },
        ],
        annotations: [
          {name: 'annotationProduct', type: 'annotationProduct'},
          {name: 'annotationLinkEmail', type: 'annotationLinkEmail'},
          {name: 'annotationLinkExternal', type: 'annotationLinkExternal'},
        ],
      },
      type: 'block',
    },
  ],
})
