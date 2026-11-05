import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { SiteContext } from '../components/site/SiteContext';
import type { SiteData } from '../lib/site';

export const SITE: SiteData = {
  settings: {
    contacts: { phone: '+374 10 123456', email: 'hello@example.am', hours: 'Շուրջօրյա', address: 'Երևան' },
    social: { whatsapp_url: 'https://wa.me/37410123456', telegram_url: 'https://t.me/example', facebook_url: 'https://facebook.com/example', instagram_url: null },
    branding: { site_name: 'Կլիմայի կենտրոն', tagline: 'Տեղադրում և վերանորոգում', logo_url: '/uploads/logo.png', hero_image_url: '/uploads/hero.webp' },
    header: { hours_text: 'Շուրջօրյա', arrival_text: '2 ժամում', free_visit_text: 'Անվճար այց', cta_label: 'Թողնել հայտ' },
    footer: { copyright: '© Կենտրոն', disclaimer: 'Ծանոթագրություն' }
  },
  nav: {
    topbar: [{ id: 't1', label: 'Մեր մասին', href: '/o-kompanii' }],
    header: [{ id: 'h1', label: 'Կոնտակտներ', href: '/kontakty' }],
    footer: [{ id: 'f1', label: 'Հարցեր', href: '/voprosy' }],
    mobile: [{ id: 'm1', label: 'Մեր աշխատանքները', href: '/nashi-raboty' }],
    cities: [{ id: 'c1', label: 'Երևան', href: '/' }]
  },
  services: {
    service: [
      { id: 's1', category: 'service', title: 'Վերանորոգում', menu_title: 'Օդորակիչի վերանորոգում', pill_title: 'ՎԵՐԱՆՈՐՈԳՈՒՄ', show_in_menu: true, show_in_pills: true, href: '/usluga/remont' },
      { id: 's2', category: 'service', title: 'Թաքնված', menu_title: 'Չերևացող', pill_title: null, show_in_menu: false, show_in_pills: false, href: '/usluga/skryto' }
    ],
    fault: [{ id: 'f1', category: 'fault', title: 'Չի սառեցնում', menu_title: 'Չի՞ սառեցնում', pill_title: 'ՉԻ՞ ՍԱՌԵՑՆՈՒՄ', show_in_menu: true, show_in_pills: true, href: '/usluga/ne-holodit' }]
  },
  galleries: {
    brands: [{ id: 'b1', url: '/uploads/lg.png', title: 'LG', alt: null, link_url: null }],
    certificates: [{ id: 'c1', url: '/uploads/cert.png', title: 'Վկայական', alt: null, link_url: null }],
    works: [
      { id: 'w1', url: '/uploads/w1.jpg', title: null, alt: 'Աշխատանք մեկ', link_url: null },
      { id: 'w2', url: '/uploads/w2.jpg', title: null, alt: 'Աշխատանք երկու', link_url: null }
    ]
  }
};

export function renderWithSite(ui: ReactElement, site: SiteData | null = SITE) {
  return render(ui, { wrapper: ({ children }) => <SiteContext.Provider value={site}>{children}</SiteContext.Provider> });
}
