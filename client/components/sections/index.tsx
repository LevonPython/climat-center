import type { ComponentType } from 'react';
import type { PageSection } from '../../lib/site';
import { Callout, IntroBanner, ServiceBanner } from './banners';
import { Advantages, IconFeatures, Products, Signs, Steps, Tools, WorkCards } from './cards';
import { GallerySection, Photos, VideoSection } from './media';
import { PriceCards, PriceList } from './prices';
import { ContactsSection, Listing, MapSection, RequestFormSection } from './site';
import { ErrorCodes, Faq, ImageText, RichTextSection } from './text';

type SectionProps = { content: Record<string, any>; sectionId: string; overlapIntro?: boolean };

// One entry per type in server/src/contentSchemas/blockTypes.js. A test keeps the two lists equal.
export const SECTION_COMPONENTS: Record<string, ComponentType<SectionProps>> = {
  intro_banner: IntroBanner,
  rich_text: RichTextSection,
  icon_features: IconFeatures,
  work_cards: WorkCards,
  image_text: ImageText,
  steps: Steps,
  price_cards: PriceCards,
  price_list: PriceList,
  advantages: Advantages,
  tools: Tools,
  gallery: GallerySection,
  faq: Faq,
  error_codes: ErrorCodes,
  listing: Listing,
  request_form: RequestFormSection,
  contacts_strip: ContactsSection,
  service_banner: ServiceBanner,
  callout: Callout,
  video: VideoSection,
  photos: Photos,
  products: Products,
  signs: Signs,
  map: MapSection
};

export function Sections({ sections }: { sections: PageSection[] }) {
  return (
    <>
      {sections.map((section, index) => {
        const Component = SECTION_COMPONENTS[section.block_type];
        if (!Component) return null;
        const overlapIntro = section.block_type === 'icon_features' && sections[index - 1]?.block_type === 'intro_banner';
        return <Component key={section.id} content={section.content} sectionId={section.id} overlapIntro={overlapIntro} />;
      })}
    </>
  );
}
