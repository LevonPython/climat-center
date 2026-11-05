// Rewrites text from the Russian site for the Armenian company: Moscow becomes Yerevan, and ruble prices and
// time-limited Russian promotions go. Anything removed is reported, so it can be listed for review.
const REPLACEMENTS = [
  [/(^|[^А-Яа-яЁё])в\s+Москве\s*(?:и|\/)\s*(?:в\s+)?(?:Московской области|области|Подмосковье|МО)(?![А-Яа-яЁё])/g, '$1в Ереване'],
  [/(^|[^А-Яа-яЁё])по\s+Москве\s*(?:и|\/)\s*(?:по\s+)?(?:Московской области|области|Подмосковью|МО)(?![А-Яа-яЁё])/g, '$1по Еревану'],
  [/(^|[^А-Яа-яЁё])Москвы\s+и\s+(?:Московской области|области|Подмосковья|МО)(?![А-Яа-яЁё])/g, '$1Еревана'],
  [/(^|[^А-Яа-яЁё])Москве(?![А-Яа-яЁё])/g, '$1Ереване'],
  [/(^|[^А-Яа-яЁё])Москву(?![А-Яа-яЁё])/g, '$1Ереван'],
  [/(^|[^А-Яа-яЁё])Москвы(?![А-Яа-яЁё])/g, '$1Еревана'],
  [/(^|[^А-Яа-яЁё])Москва(?![А-Яа-яЁё])/g, '$1Ереван'],
  [/(^|[^А-Яа-яЁё])Московской области(?![А-Яа-яЁё])/g, '$1Армении'],
  [/(^|[^А-Яа-яЁё])Подмосковье(?![А-Яа-яЁё])/g, '$1Армении'],
  [/(^|[^А-Яа-яЁё])в\s+МО(?![А-Яа-яЁё])/g, '$1в Армении'],
  [/(^|[^А-Яа-яЁё])МКАД[а-я]*/g, '$1города']
];

// Claims that only hold in Russia. They run before the city swap, which would otherwise move a named Moscow lawyer to Yerevan.
const RUSSIA_ONLY = [
  [/<blockquote>\s*<p>"Ответственность за сосульки[\s\S]*?<\/blockquote>/g, ''],
  [/\s+по\s+СП\s+131\.13330/g, ''],
  [/СНиП\s+33-75/g, 'действующим нормам'],
  [/Градостроительного кодекса,\s*отраслевых(\s*<br\s*\/?>\s*)стандартов и ГОСТов, НД, ТИ, ТУ,\s*архитектурно-строительных/g, 'градостроительных норм, отраслевых$1стандартов, архитектурно-строительных'],
  [/,\s*СанПин\./g, ', санитарных норм.'],
  [/российским и(\s*<br\s*\/?>\s*)международным/g, 'национальным и$1международным'],
  [/Являемся членом СРО\.\s*/g, '']
];

const PROMOTION = /Скидка\s*\d+\s*%?\s*до\s+\d+\s+[А-Яа-яЁё]+!?/g;
const RUBLES = /\s*(?:по цене\s+|стоимостью\s+)?(?:от\s+|за\s+|до\s+)?\d[\d\s]*(?:[.,]\d+)?\s*(?:рублей|рубля|рубль|руб\.?|р\.|₽)(?![А-Яа-яЁё])/g;

function adaptForArmenia(input) {
  const removed = [];
  let text = input;

  for (const [pattern, replacement] of RUSSIA_ONLY) {
    text = text.replace(pattern, (match, ...groups) => {
      removed.push(match.replace(/<[^>]+>/g, ' ').trim());
      return replacement.replace('$1', typeof groups[0] === 'string' ? groups[0] : '');
    });
  }
  for (const pattern of [PROMOTION, RUBLES]) {
    text = text.replace(pattern, (match) => {
      removed.push(match.trim());
      return '';
    });
  }
  for (const [pattern, replacement] of REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  // What's left of a price per 100 grams once its amount is gone.
  text = text.replace(/(<p>\s*(<strong>\s*<\/strong>\s*)?)?\/\s*100\s*г(?![а-яё])\.?(\s*<\/p>)?/g, '');

  return { text: text.replace(/\s+([.,!?:;])/g, '$1').replace(/\s{2,}/g, ' ').trim(), removed };
}

module.exports = { adaptForArmenia };
