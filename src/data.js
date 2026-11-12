// Page artwork lives in public/pages as WebP in three widths (see scripts/optimize_images.py).
// Bump PAGES_VERSION whenever that artwork changes, so browsers holding the 7-day cache fetch the new files
// (keep the preload links in index.html in step).
const PAGES_VERSION = '2';
export const pageSrc = (id, width = 1100) => `/pages/${id}-${width}.webp?v=${PAGES_VERSION}`;
export const pageSrcSet = (id) => `${pageSrc(id, 720)} 720w, ${pageSrc(id, 1100)} 1100w`;

export const pages = [
  { id: 'festive-1', name: 'Front cover', cover: true },
  { id: 'festive-2-0', name: 'The Spirit of Dolanan — left' },
  { id: 'festive-2-1', name: 'The Spirit of Dolanan — right' },
  { id: 'festive-3-0', name: 'The Joy of Christmas — left' },
  { id: 'festive-3-1', name: 'The Joy of Christmas — right' },
  { id: 'festive-4-0', name: 'A Night of Flavours, Play & New Beginnings — left' },
  { id: 'festive-4-1', name: 'A Night of Flavours, Play & New Beginnings — right' },
  { id: 'festive-5-0', name: 'A Festive Ritual of Renewal — left' },
  { id: 'festive-5-1', name: 'A Festive Ritual of Renewal — right' },
  { id: 'festive-6', name: 'Back cover — reservations and contact', cover: true },
];

export const chapters = [
  { start: 0, title: 'The Beginning', short: 'Cover', subtitle: 'The timeless joy of Balinese childhood' },
  { start: 1, title: 'The Spirit of Dolanan', short: 'The Story', subtitle: 'A celebration of simple joys' },
  { start: 3, title: 'The Joy of Christmas', short: 'Christmas', subtitle: '24 – 25 December 2026' },
  { start: 5, title: 'A Night of New Beginnings', short: 'New Year', subtitle: '31 December 2026 – 1 January 2027' },
  { start: 7, title: 'A Ritual of Renewal', short: 'Wellness', subtitle: 'Sebatu Ening at Pravi Spa and Wellness' },
  { start: 9, title: 'Until We Meet Again', short: 'Contact', subtitle: 'Reserve your festive celebration' },
];

// Spread mode shows the cover alone, then pairs (1|2), (3|4)… so a "position" counts turned leaves.
// Single mode shows one page per position.
export const maxPosition = (mode) => (mode === 'spread' ? Math.ceil(pages.length / 2) : pages.length - 1);
export const toPosition = (page, mode) => (mode === 'spread' ? (page === 0 ? 0 : Math.floor((page + 1) / 2)) : page);
export const toPage = (position, mode) => (mode === 'spread' ? (position === 0 ? 0 : 2 * position - 1) : position);
