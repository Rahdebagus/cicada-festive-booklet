// Page artwork lives in public/pages as WebP in three widths (see scripts/optimize_images.py).
export const pageSrc = (id, width = 1100) => `/pages/${id}-${width}.webp`;
export const pageSrcSet = (id) => `${pageSrc(id, 720)} 720w, ${pageSrc(id, 1100)} 1100w`;

export const pages = [
  { id: 'festive-1', name: 'Front cover', cover: true },
  { id: 'festive-2-0', name: 'The Spirit of Dolanan — left' },
  { id: 'festive-2-1', name: 'The Spirit of Dolanan — right' },
  { id: 'festive-3-0', name: 'Christmas festivities — left' },
  { id: 'festive-3-1', name: 'Christmas festivities — right' },
  { id: 'festive-4-0', name: 'New Year celebrations — left' },
  { id: 'festive-4-1', name: 'New Year celebrations — right' },
  { id: 'festive-5-0', name: 'Sebatu wellness — left' },
  { id: 'festive-5-1', name: 'Sebatu wellness — right' },
  { id: 'festive-6', name: 'Back cover', cover: true },
];

export const chapters = [
  { start: 0, title: 'The Beginning', short: 'Cover', subtitle: 'A festive season inspired by Bali' },
  { start: 1, title: 'The Spirit of Dolanan', short: 'The Story', subtitle: 'A celebration of simple joys' },
  { start: 3, title: 'A Balinese Christmas', short: 'Christmas', subtitle: 'The joy of togetherness' },
  { start: 5, title: 'New Beginnings', short: 'New Year', subtitle: 'An evening to remember' },
  { start: 7, title: 'A Ritual of Renewal', short: 'Wellness', subtitle: 'Return to balance' },
  { start: 9, title: 'Until We Meet Again', short: 'Contact', subtitle: 'Cicada Resort Bali Ubud' },
];

// Spread mode shows the cover alone, then pairs (1|2), (3|4)… so a "position" counts turned leaves.
// Single mode shows one page per position.
export const maxPosition = (mode) => (mode === 'spread' ? Math.ceil(pages.length / 2) : pages.length - 1);
export const toPosition = (page, mode) => (mode === 'spread' ? (page === 0 ? 0 : Math.floor((page + 1) / 2)) : page);
export const toPage = (position, mode) => (mode === 'spread' ? (position === 0 ? 0 : 2 * position - 1) : position);
