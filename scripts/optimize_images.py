"""Generate web-optimised booklet pages and brand assets.

Reads the original artwork from ``source-images/`` and writes:
  public/pages/<name>-720.webp   small screens / 1x displays
  public/pages/<name>-1100.webp  retina book pages
  public/pages/<name>-1650.webp  full-resolution zoom view
  public/brand/*                 logo crops, favicons

Usage:
  python scripts/optimize_images.py                       re-optimise source-images/ (requires Pillow)
  python scripts/optimize_images.py "path/to/booklet.pdf"  render a new booklet PDF first (also requires PyMuPDF):
      square pages become festive-<n>.jpg, two-page spreads are split into festive-<n>-0.jpg / -1.jpg,
      and the PDF is copied to public/ as the visitor download.
After changing the artwork, bump PAGES_VERSION in src/data.js and the ?v= in index.html.
"""
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'source-images'
PAGES_OUT = ROOT / 'public' / 'pages'
BRAND_OUT = ROOT / 'public' / 'brand'
PUBLIC = ROOT / 'public'
DOWNLOAD_PDF = PUBLIC / 'Festive_2026_Cicada_Ubud.pdf'
PAGE_SIDE = 1650

PAGES = ['festive-1', 'festive-2-0', 'festive-2-1', 'festive-3-0', 'festive-3-1',
         'festive-4-0', 'festive-4-1', 'festive-5-0', 'festive-5-1', 'festive-6']
# width -> WebP quality. Smaller sizes get a light sharpen to keep body copy crisp.
SIZES = {720: 80, 1100: 82, 1650: 84}
# Heavy film grain inflates these pages; grain hides compression, so trade a little quality for size.
QUALITY_OFFSET = {'festive-4-0': -6, 'festive-4-1': -16}
BRAND_GREEN = (21, 35, 28, 255)


def save_webp(image, path, quality):
    image.save(path, 'WEBP', quality=quality, method=6)


def render_pdf(pdf_path):
    import fitz  # PyMuPDF, only needed for this step

    document = fitz.open(pdf_path)
    for number, page in enumerate(document, start=1):
        zoom = PAGE_SIDE / page.rect.height
        pixmap = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False, colorspace=fitz.csRGB)
        image = Image.frombytes('RGB', (pixmap.width, pixmap.height), pixmap.samples)
        if image.width <= PAGE_SIDE:
            image.save(SOURCE / f'festive-{number}.jpg', quality=95, subsampling=0)
            continue
        for half in (0, 1):
            leaf = image.crop((half * image.width // 2, 0, (half + 1) * image.width // 2, image.height))
            leaf.save(SOURCE / f'festive-{number}-{half}.jpg', quality=95, subsampling=0)
    shutil.copyfile(pdf_path, DOWNLOAD_PDF)


def build_pages():
    PAGES_OUT.mkdir(parents=True, exist_ok=True)
    for name in PAGES:
        original = Image.open(SOURCE / f'{name}.jpg').convert('RGB')
        for width, quality in SIZES.items():
            image = original if original.width == width else original.resize((width, round(original.height * width / original.width)), Image.LANCZOS)
            if width < original.width:
                image = image.filter(ImageFilter.UnsharpMask(radius=0.6, percent=55, threshold=2))
            save_webp(image, PAGES_OUT / f'{name}-{width}.webp', quality + QUALITY_OFFSET.get(name, 0))


def whiten(image):
    """The logo is white artwork on transparency; force RGB to white so resampling never darkens edges."""
    alpha = image.getchannel('A')
    white = Image.new('RGBA', image.size, (255, 255, 255, 255))
    white.putalpha(alpha)
    return white


def fit_height(image, height):
    return image.resize((round(image.width * height / image.height), height), Image.LANCZOS)


def build_brand():
    BRAND_OUT.mkdir(parents=True, exist_ok=True)
    logo = whiten(Image.open(SOURCE / 'Black-Logo-Cicada.png').convert('RGBA'))
    logo = logo.crop(logo.getchannel('A').getbbox())

    # Row bands measured from the artwork: emblem 0-765, CICADA 980-1445, UBUD 1653-1827, Autograph line below.
    emblem = logo.crop((1283, 0, 1943, 766))
    lockup = logo.crop((388, 0, 2837, 1828))

    save_webp(fit_height(logo, 420), BRAND_OUT / 'cicada-logo.webp', 90)
    save_webp(fit_height(lockup, 200), BRAND_OUT / 'cicada-lockup.webp', 90)
    save_webp(fit_height(emblem, 160), BRAND_OUT / 'cicada-emblem.webp', 90)

    def icon(size, radius_ratio):
        canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        mask = Image.new('L', (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=round(size * radius_ratio), fill=255)
        canvas.paste(Image.new('RGBA', (size, size), BRAND_GREEN), mask=mask)
        mark = fit_height(emblem, round(size * 0.66))
        canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
        return canvas

    icon(64, 0.22).save(PUBLIC / 'favicon.png', optimize=True)
    icon(180, 0).convert('RGB').save(PUBLIC / 'apple-touch-icon.png', optimize=True)
    icon(256, 0.22).save(PUBLIC / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])


if __name__ == '__main__':
    if len(sys.argv) > 1:
        render_pdf(sys.argv[1])
    build_pages()
    build_brand()
    for folder in (PAGES_OUT, BRAND_OUT):
        total = sum(f.stat().st_size for f in folder.iterdir())
        print(f'{folder.relative_to(ROOT)}: {total / 1024:.0f} KB')
