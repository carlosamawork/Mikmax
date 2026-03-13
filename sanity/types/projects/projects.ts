import { PortableTextBlock } from '@portabletext/types';
import { ProjectMedia } from '../objects/module/projectsProjectMedia'

export interface ProjectListingType {
  _id: string
  title: string
  slug: string
  credits?: PortableTextBlock[];
  media?: ProjectMedia[]
}
