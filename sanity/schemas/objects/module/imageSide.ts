import { defineField } from "sanity";

export default defineField({
  name: "module.imageSide",
  title: "Side Image",
  type: "object",
  fields: [
    defineField({
      name: "imageType",
      title: "Side Image type",
      type: "string",
      initialValue: "Left Image",
      options: {
        layout: "dropdown",
        list: [
          {
            title: "Left Image",
            value: "Left Image",
          },
          {
            title: "Right Image",
            value: "Right Image",
          },
        ],
      },
    }),
    // Image
    defineField({
      name: "singleImage",
      title: "Text Image",
      type: "image",
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: "caption",
          type: "string",
          title: "Caption",
        },
        {
          name: "alt",
          type: "string",
          title: "Alternative Text",
        },
      ],
    }),
    defineField({
      name: "backgroundColor",
      title: "Background Color",
      type: "string",
      initialValue: "white",
      options: {
        layout: "dropdown",
        list: [
          {
            title: "White",
            value: "white",
          },
          {
            title: "Dark grey",
            value: "darkgrey",
          },
          {
            title: "Grey",
            value: "grey",
          },
          {
            title: "Light grey",
            value: "lightgrey",
          },
          {
            title: "Black",
            value: "black",
          },
          {
            title: "Red",
            value: "red",
          },
          {
            title: "Light red",
            value: "lightred",
          },

        ],
      },
    }),
    defineField({
      name: "typographyColor",
      title: "Typography Color",
      type: "string",
      initialValue: "black",
      options: {
        layout: "dropdown",
        list: [
          {
            title: "White",
            value: "white",
          },
          {
            title: "Dark grey",
            value: "darkgrey",
          },
          {
            title: "Grey",
            value: "grey",
          },
          {
            title: "Light grey",
            value: "lightgrey",
          },
          {
            title: "Black",
            value: "black",
          },
          {
            title: "Red",
            value: "red",
          },
          {
            title: "Light red",
            value: "lightred",
          },

        ],
      },
    }),
    // Title
    defineField({
      name: "title",
      title: "Title",
      type: "string",
    }),
    // Subtitle
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: 'body',
    }),
    defineField({
      name: "ctabutton2",
      title: "Cta Button Izquierdo",
      type: "string",
    }),
    defineField({
      name: "ctaurl2",
      title: "Cta URL Izquierdo",
      type: "string",
    }),
    defineField({
      name: "ctatarget2",
      title: "Cta Target Izquierdo",
      type: "string",
      initialValue: "_self",
      options: {
        layout: "dropdown",
        list: [
          {
            title: "Default",
            value: "_self",
          },
          {
            title: "Nueva ventana",
            value: "_blank",
          },
        ],
      },
    }),
    defineField({
      name: "ctabutton",
      title: "Cta Button",
      type: "string",
    }),
    defineField({
      name: "ctaurl",
      title: "Cta URL",
      type: "string",
    }),
    defineField({
      name: "ctatarget",
      title: "Cta Target",
      type: "string",
      initialValue: "_self",
      options: {
        layout: "dropdown",
        list: [
          {
            title: "Default",
            value: "_self",
          },
          {
            title: "New window",
            value: "_blank",
          },
        ],
      },
    }),
    defineField({
      name: "anchorid",
      title: "Anchor ID",
      type: "string",
    }),
  ],
  preview: {
    select: {
      title: "title",
    },
    prepare(selection) {
      let { title } = selection;
      if (!title) title = "Image side";

      return {
        title,
      };
    },
  },
});
