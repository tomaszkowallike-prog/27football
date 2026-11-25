# juggling sheets (8x2, black background): one 16-frame strip per player, every frame the same box, feet aligned
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]; return x * x + y * y <= r * r
def key_black(im):
    # the sheets hold complete figures on pure black (0-1): everything that is not pure black is body,
    # gaps in the body are closed and filled; only WIDE pure-black pockets (between legs, arm and torso) stay see-through
    mx = im.max(-1)
    body = ndi.binary_closing(mx > 2, structure=disk(2))
    body = ndi.binary_fill_holes(body)
    pocket = ndi.binary_opening(mx <= 2, structure=disk(5))
    pocket = ndi.binary_dilation(pocket, structure=disk(2)) & (mx <= 4)
    body &= ~pocket
    # tiny leftover holes inside the kit get filled
    holes = ndi.binary_fill_holes(body) & ~body
    lab, n = ndi.label(holes); sz = ndi.sum(holes, lab, range(1, n + 1))
    body |= np.isin(lab, [i + 1 for i, v in enumerate(sz) if v < 90])
    lab, n = ndi.label(body); sz = ndi.sum(body, lab, range(1, n + 1))
    return np.isin(lab, [i + 1 for i, v in enumerate(sz) if v > 200])
TH, TW = 150, 116
for num in ('14', '10', '7', '27'):
    im = np.array(Image.open(f'/home/claude/kunio/src/jug/{num}.png').convert('RGB')).astype(int); H, W = im.shape[:2]
    a = key_black(im); ch, cw = H // 2, W // 8
    cells = [(im[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw], a[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]) for r in range(2) for c in range(8)]
    # feet = lowest opaque row in each cell; scale from frame 0's figure height
    ys0 = np.nonzero(cells[0][1].any(1))[0]; k = 136 / (ys0.max() - ys0.min())
    strip = Image.new('RGBA', (TW * 16, TH))
    for i, (rgb, al) in enumerate(cells):
        ys, xs = np.nonzero(al); feet = ys.max(); cx = (xs.min() + xs.max()) / 2
        img = Image.fromarray(np.dstack([rgb, al * 255]).astype(np.uint8), 'RGBA')
        w2, h2 = round(cw * k), round(ch * k); img = img.resize((w2, h2), Image.BOX)
        q = np.array(img); q[..., 3] = (q[..., 3] > 120) * 255; img = Image.fromarray(q)
        ox = round(TW / 2 - (cw / 2) * k); oy = round(TH - 4 - feet * k)
        tile = Image.new('RGBA', (TW, TH)); tile.paste(img, (ox, oy), img); strip.paste(tile, (i * TW, 0))
    strip.save(f'/home/claude/kunio/game/juggle_{num}.png')
prev = Image.new('RGBA', (TW * 16, TH * 4), (40, 60, 90, 255))
for j, num in enumerate(('14', '10', '7', '27')): s = Image.open(f'/home/claude/kunio/game/juggle_{num}.png'); prev.alpha_composite(s, (0, j * TH))
prev.save('/tmp/fr/jugs.png')
