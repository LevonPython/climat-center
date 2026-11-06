// Content from the old site that is unsafe, wrong, or true only of the Russian business.
// Each rule must still match when the content is extracted again, so a rule can't quietly stop working.
const FUSE = 'predohranitel-v-kondicionere-peregorel-chto-predprinyat';
const REPAIR = 'usluga/remont-kondicionerov';
const INSTALLATION = 'usluga/ustanovka-kondicionerov';

const TEXT_EDITS = {
  [FUSE]: [['Специальный «жучок» вместо предохранителя. ', '']],
  'usluga/prodazha-i-ustanovka-brizerov': [
    ['<b>Технология эффективна для профилактики COVID-19</b> ', ''],
    ['Являясь дилером TION, вы можете быть уверены в качественной продукции.', 'Вы можете быть уверены в качественной продукции.']
  ],
  'osnovnye-neispravnosti-kondicionerov': [
    [
      'Это нормальное явление, которое происходит в размере 2-3% в год. Однако, если утечка превышает норму, это может привести к серьезным проблемам, таким как механические неисправности. Для избежания таких ситуаций необходимо регулярно проводить <a href="/usluga/dozapravka-kondicionerov">дозаправку фреоном</a>.',
      'Это может привести к серьезным проблемам, таким как механические неисправности. При утечке нужно найти и устранить ее причину, а затем провести <a href="/usluga/dozapravka-kondicionerov">дозаправку фреоном</a>.'
    ]
  ],
  'kak-ustanovit-kondicioner-svoimi-rukami-poshagovaya-instrukciya': [[' Например, в марке бренда присутствует обозначение 07 или 09 – это для комнат 7 м² и 9 м².', '']],
  'spasaem-kvartiru-ot-zhary-5-prostyh-sposobov-ohladit-kvartiru-i-uvlazhnit-vozduh-bez-kondicionera': [['Наличие кондиционера и вентилятора в квартире часто влечет за собой плохие последствия. ', '']],
  [REPAIR]: [
    ['Акция - бесплатный выезд специалиста в 2026 в Ереване', 'Бесплатный выезд специалиста в Ереване'],
    ['оперативную замену на новый кондиционер со скидкой!', 'оперативную замену на новый кондиционер!']
  ],
  'usluga/prodazha-kondicionerov': [['Кондиционеры по выгодным ценам с бесплатной доставкой! Акции и скидки. Более 1000 кондиционеров на выбор. ', 'Кондиционеры по выгодным ценам. ']],
  [INSTALLATION]: [
    ['акционные цены на монтаж под ключ', 'монтаж под ключ'],
    ['Акции! Бесплатный выезд. Скидки пенсионерам. Спеццены при покупке кондиционера. ', 'Бесплатный выезд. '],
    ['Монтаж сплит-систем в 2026 году в Центр Климата', 'Монтаж сплит-систем в Центре Климата'],
    ['При покупке с установкой действуют скидки', 'Профессиональная установка кондиционеров'],
    ['Установить кондиционер недорого - цены снижены!', 'Установить кондиционер недорого']
  ],
  'usluga/demontazh-kondicionerov': [['Взамен установим новый кондиционер по спеццене. ', '']],
  'sosulka-upala-na-kondicioner': [['новый кондиционер. Официальный дилер по кондиционерам. в Ереване', 'новый кондиционер в Ереване']],
  'kody-oshibok-kondicionerov': [[/^<p><a href="media:[^"]*oshibka\.jpeg"><img [^>]*\/><\/a><\/p>/, '']]
};

const DROPPED_SECTIONS = {
  [FUSE]: { pattern: 'Специальный «жучок» вместо предохранителя', note: 'The advice to fit a piece of copper wire in place of a blown fuse, a fire risk' },
  'usluga/proektirovanie-sistemy-kondicionirovaniya': { pattern: 'Proekt_OV', note: 'The sample design pages, a Russian project in Russian' }
};

const DROPPED_LIST_ITEMS = {
  [REPAIR]: ['В 90% случаев починим в течение часа в день вашей заявки!', 'Присоединяйтесь к нам и получите скидку на дальнейшее обслуживание!', 'Согласно опроса 60% клиентов обращаются к нам по рекомендации знакомых!'],
  'usluga/montazh-teplovogo-nasosa-vozduh-voda': ['Оборудование от официального дилера']
};

const CLEARED_PICTURES = { [REPAIR]: 'cgr.png' };

const EDIT_NOTES = {
  'usluga/prodazha-i-ustanovka-brizerov': 'The claim that the technology prevents COVID-19, and the TION dealer claim',
  'osnovnye-neispravnosti-kondicionerov': 'The claim that losing 2-3% of the freon a year is normal and needs regular recharging',
  'kak-ustanovit-kondicioner-svoimi-rukami-poshagovaya-instrukciya': 'The wrong statement that a model marked 07 or 09 suits rooms of 7 or 9 m²',
  'spasaem-kvartiru-ot-zhary-5-prostyh-sposobov-ohladit-kvartiru-i-uvlazhnit-vozduh-bez-kondicionera': 'The statement that having an air conditioner often has bad consequences',
  [REPAIR]: 'Figures from the Russian business (90% of repairs within an hour, 60% from recommendations), discount offers and the before and after picture with Russian labels',
  'usluga/prodazha-kondicionerov': 'The claims of free delivery, discounts and more than 1000 air conditioners',
  [INSTALLATION]: 'Discounts, reduced prices and the discount for pensioners',
  'usluga/demontazh-kondicionerov': 'The special price on a replacement',
  'sosulka-upala-na-kondicioner': 'The official dealer claim',
  'usluga/montazh-teplovogo-nasosa-vozduh-voda': 'The official dealer claim',
  'kody-oshibok-kondicionerov': 'The diagram with Russian labels'
};

const DROPPED_WORKS = /proekt_ventilyatsii|d7wvwk9lgts|4lgh49jng4y|vxtrnsxd0f4|ilovepdf_merged_page-000[678]/;
const YEAR_IN_SEO_TEXT = /\s+в 20\d\d( году)?(?=\s)/g;
const SEO_FIELDS = ['title', 'meta_title', 'meta_description'];

function mapStrings(value, change) {
  if (typeof value === 'string') return change(value);
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, change));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapStrings(item, change)]));
  return value;
}

function assertUsed(slug, rule, used) {
  if (!used) throw new Error(`The removal rule no longer matches ${slug}: ${rule}`);
}

function applyTextEdits(page) {
  return (TEXT_EDITS[page.slug] || []).reduce((current, [from, to]) => {
    let used = false;
    const next = mapStrings(current, (text) => {
      const edited = text.replace(from, to);
      used = used || edited !== text;
      return edited;
    });
    assertUsed(page.slug, from, used);
    return next;
  }, page);
}

function dropSections(page) {
  const rule = DROPPED_SECTIONS[page.slug];
  if (!rule) return page;
  const sections = page.sections.filter((item) => !JSON.stringify(item).includes(rule.pattern));
  assertUsed(page.slug, rule.pattern, sections.length < page.sections.length);
  return { ...page, sections };
}

function dropListItems(page) {
  return (DROPPED_LIST_ITEMS[page.slug] || []).reduce((current, text) => {
    let used = false;
    const sections = current.sections.map((item) => ({
      ...item,
      content: Object.fromEntries(
        Object.entries(item.content).map(([key, value]) => {
          if (!Array.isArray(value)) return [key, value];
          const kept = value.filter((entry) => entry.text !== text);
          used = used || kept.length < value.length;
          return [key, kept];
        })
      )
    }));
    assertUsed(page.slug, text, used);
    return { ...current, sections };
  }, page);
}

function clearPictures(page) {
  const file = CLEARED_PICTURES[page.slug];
  if (!file) return page;
  let used = false;
  const sections = page.sections.map((item) => {
    if (!String(item.content.image_url || '').endsWith(file)) return item;
    used = true;
    return { ...item, content: { ...item.content, image_url: null } };
  });
  assertUsed(page.slug, file, used);
  return { ...page, sections };
}

function dropVideos(page) {
  return { ...page, sections: page.sections.filter((item) => item.block_type !== 'video') };
}

function dropYears(page) {
  const fields = SEO_FIELDS.filter((field) => typeof page[field] === 'string').map((field) => [field, page[field].replace(YEAR_IN_SEO_TEXT, '')]);
  return { ...page, ...Object.fromEntries(fields) };
}

function removalNotes(before) {
  const videos = before.sections.filter((item) => item.block_type === 'video').map((item) => `A Russian company video: ${item.content.video_url}`);
  const notes = [EDIT_NOTES[before.slug], DROPPED_SECTIONS[before.slug]?.note].filter(Boolean);
  return [...notes, ...videos];
}

function applyRemovals(page) {
  const steps = [applyTextEdits, dropSections, dropListItems, clearPictures, dropVideos, dropYears];
  return { page: steps.reduce((current, step) => step(current), page), notes: removalNotes(page) };
}

function keepWork(item) {
  return !DROPPED_WORKS.test(item.image);
}

module.exports = { applyRemovals, keepWork, TEXT_EDITS };
