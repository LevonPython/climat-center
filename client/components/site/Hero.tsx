import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { assetUrl } from '../../lib/assets';
import { Carousel } from './Carousel';
import { useSite } from './SiteContext';

// Where the original places its 13 buttons on wide screens, as [top, left]. The last sits against the right edge.
const PILL_POSITIONS: [number, number | null][] = [
  [60, 25], [160, 25], [260, 25], [360, 25],
  [110, 270], [210, 270], [310, 270],
  [160, 510], [260, 510], [360, 510],
  [210, 750], [310, 750],
  [260, null]
];

export function Hero({ showBrands = false }: { showBrands?: boolean }) {
  const { t } = useTranslation('common');
  const { galleries, services, settings } = useSite();
  const hero = settings.branding?.hero_image_url;
  const brands = galleries.brands || [];
  const pills = [...(services.service || []), ...(services.fault || [])].filter((service) => service.show_in_pills && service.href && (service.pill_title || service.menu_title || service.title));

  return (
    <div id="top">
      {pills.length ? (
        <div className="overflow-hidden bg-cover bg-top" style={hero ? { backgroundImage: `url(${assetUrl(hero)})` } : undefined}>
          <nav aria-label={t('layout.services')} className="relative mx-auto flex max-w-site flex-wrap justify-center gap-5 px-5 py-5 wide:block wide:h-[480px] wide:py-0">
            {pills.map((pill, index) => {
              const [top, left] = PILL_POSITIONS[index] || [null, null];
              return (
                <Link
                  key={pill.id}
                  href={pill.href as string}
                  style={top === null ? undefined : ({ '--pill-top': `${top}px`, '--pill-left': left === null ? 'auto' : `${left}px`, '--pill-right': left === null ? '10px' : 'auto' } as React.CSSProperties)}
                  className="block w-[198px] rounded-[34px] border border-brand bg-white py-2.5 text-center text-sm uppercase text-ink no-underline hover:bg-brand hover:text-white wide:absolute wide:[left:var(--pill-left)] wide:[right:var(--pill-right)] wide:[top:var(--pill-top)]"
                >
                  {pill.pill_title || pill.menu_title || pill.title}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}

      {showBrands && brands.length ? (
        <div className="mx-auto mb-5 mt-2.5 max-w-site px-5">
          <Carousel label={t('layout.brands')}>
            {brands.map((brand) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={brand.id} src={assetUrl(brand.url)} alt={brand.title || brand.alt || ''} loading="lazy" className="h-16 w-[160px] shrink-0 snap-start object-contain" />
            ))}
          </Carousel>
        </div>
      ) : null}
    </div>
  );
}
