#!/usr/bin/env python3
"""
Cut the moving parts out of the header banner (the waving boy's forearm and hand, the two printed music notes, the red
marker), fill the holes they leave in the background, and write a JSON of where everything sits.

    python tools/banner_layers.py public/img/headerontop.jpg public/img/banner/

Needs: pip install opencv-python-headless numpy
All positions below were measured on a 992 x 372 copy of the banner; they are scaled to the real picture's size, so the
picture must have the same framing (aspect about 2.667). The JSON gives every box in that same 992 x 372 space, which
the page turns into percentages, so the layers line up at any size.
"""
import json, os, sys
import cv2
import numpy as np

REF_W, REF_H = 992, 372


def main(src, out_dir):
    im = cv2.imread(src)
    if im is None:
        sys.exit(f'cannot read {src}')
    H, W = im.shape[:2]
    k = W / REF_W                                    # real pixels per reference pixel
    if abs(H / W - REF_H / REF_W) > 0.02:
        sys.exit(f'{src} is {W}x{H}: not the banner framing these positions were measured on')
    os.makedirs(out_dir, exist_ok=True)
    P = lambda *v: [int(round(x * k)) for x in v]   # reference px -> real px
    b, g, r = [im[:, :, i].astype(int) for i in range(3)]
    boxes = {}

    def save_layer(name, mask, img=None):
        img = im if img is None else img
        alpha = cv2.GaussianBlur(mask, (3, 3), 0)
        x, y, w, h = cv2.boundingRect(mask)
        cv2.imwrite(os.path.join(out_dir, f'{name}.png'), np.dstack([img, alpha])[y:y + h, x:x + w])
        boxes[name] = [round(x / k, 2), round(y / k, 2), round(w / k, 2), round(h / k, 2)]

    def biggest(m):
        n, lab, st, _ = cv2.connectedComponentsWithStats(m)
        return ((lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])) if n > 1 else m > 0).astype(np.uint8) * 255

    ker = lambda n: np.ones((max(1, int(round(n * k))),) * 2, np.uint8)
    holes = np.zeros((H, W), np.uint8)

    # ---- the raised arm (skin colour inside a hand-drawn region), then split at the wrist ----
    region = np.zeros((H, W), np.uint8)
    cv2.fillPoly(region, [np.array([P(596, 12), P(705, 12), P(733, 96), P(731, 206), P(690, 210), P(640, 120), P(596, 80)], np.int32)], 255)
    skin = ((b > 70) & (r > 150) & (r - b > 45)).astype(np.uint8) * 255
    arm = biggest(cv2.morphologyEx(cv2.bitwise_and(skin, region), cv2.MORPH_CLOSE, ker(5)))
    arm = cv2.morphologyEx(arm, cv2.MORPH_CLOSE, ker(9))
    ff = arm.copy(); cv2.floodFill(ff, np.zeros((H + 2, W + 2), np.uint8), (0, 0), 255); arm |= cv2.bitwise_not(ff)
    arm = cv2.dilate(arm, ker(3))
    holes |= cv2.dilate(arm, ker(7))
    # the wrist: a slanted line from (667,132) to (717,110) in reference px; each part overlaps the other a little
    (x1, y1), (x2, y2) = P(667, 132), P(717, 110)
    yy, xx = np.mgrid[0:H, 0:W]
    side = ((yy - y1) * (x2 - x1) - (xx - x1) * (y2 - y1)) / np.hypot(x2 - x1, y2 - y1)   # >0: forearm side, in px
    ov = 6 * k
    hand = (arm * np.clip((ov - side) / (4 * k), 0, 1)).astype(np.uint8)
    fore = (arm * np.clip((side + ov) / (4 * k), 0, 1)).astype(np.uint8)
    ax, ay, aw, ah = cv2.boundingRect(arm)
    for name, m in [('hand', hand), ('forearm', fore)]:     # both cut to the whole arm's box, so they stack exactly
        cv2.imwrite(os.path.join(out_dir, f'{name}.png'), np.dstack([im, cv2.GaussianBlur(m, (3, 3), 0)])[ay:ay + ah, ax:ax + aw])
    boxes['arm'] = [round(ax / k, 2), round(ay / k, 2), round(aw / k, 2), round(ah / k, 2)]
    boxes['wrist'] = [round(((x1 + x2) / 2) / k, 2), round(((y1 + y2) / 2) / k, 2)]      # the hand turns here
    boxes['elbow'] = [round((ax + aw * 0.80) / k, 2), round((ay + ah * 0.97) / k, 2)]   # the forearm turns here

    # ---- the two printed music notes, each with its soft white glow ----
    dark = ((r < 90) & (g < 90) & (b < 90)).astype(np.uint8)
    pale = (b > 40) & (r > 225) & (g > 195)

    def glyph(box):
        x0, y0, x1, y1 = P(*box); m = np.zeros((H, W), np.uint8); m[y0:y1, x0:x1] = dark[y0:y1, x0:x1]
        core = biggest(m)
        return ((core > 0) | ((cv2.dilate(core, ker(25)) > 0) & pale))

    gn, gc = glyph((470, 30, 572, 160)), glyph((546, 96, 612, 228))
    for name, m in [('note', gn), ('clef', gc & ~gn)]:
        m = cv2.dilate(cv2.morphologyEx(m.astype(np.uint8) * 255, cv2.MORPH_CLOSE, ker(3)), ker(3))
        save_layer(name, m); holes |= cv2.dilate(m, ker(7))

    # ---- the red marker: a tapering band along its axis, cleaned of the ground and the card around it ----
    tip = np.array(P(103, 190), float); end = np.array(P(204, 372), float)
    d = (end - tip) / np.linalg.norm(end - tip); n = np.array([-d[1], d[0]])
    prof = [(0, 3), (8, 6), (20, 12), (35, 17), (55, 22), (110, 24), (120, 23), (240, 23)]
    pts = [tip + d * s * k + n * w * k for s, w in prof] + [tip + d * s * k - n * w * k for s, w in prof][::-1]
    band = np.zeros((H, W), np.uint8); cv2.fillPoly(band, [np.array(pts, np.int32)], 255)
    holes |= cv2.dilate(band, ker(5))
    s = ((xx - tip[0]) * d[0] + (yy - tip[1]) * d[1]) / k
    yellow = (r > 110) & (g > 90) & (b < 0.5 * g) & (r - b > 80)
    card = (s < 95) & (r > 190) & (g > 190) & (b > 190) & (np.abs(r - b) < 30)
    mk = np.where(cv2.dilate((yellow | card).astype(np.uint8), ker(3)) > 0, 0, band).astype(np.uint8)
    mk = cv2.morphologyEx(mk, cv2.MORPH_OPEN, ker(3))
    save_layer('marker', mk)
    boxes['tip'] = [round(tip[0] / k, 2), round(tip[1] / k, 2)]
    boxes['axis'] = [round(d[0], 5), round(d[1], 5)]

    # ---- the background without them ----
    base = cv2.inpaint(im, holes, int(round(9 * k)), cv2.INPAINT_TELEA)
    cv2.imwrite(os.path.join(out_dir, 'base.jpg'), base, [cv2.IMWRITE_JPEG_QUALITY, 86])

    # ---- the eyes (for the blinking lids): the white of each eye as a circle, and the skin just above it ----
    white = (r > 200) & (g > 200) & (b > 200)
    for name, box in [('eyeL', (760, 120, 825, 195)), ('eyeR', (840, 140, 930, 215))]:
        x0, y0, x1, y1 = P(*box)
        iris = (r < 200) & (g < 160) & (b < 120)
        m = cv2.morphologyEx(((white | iris)[y0:y1, x0:x1]).astype(np.uint8) * 255, cv2.MORPH_CLOSE, ker(7))
        p = np.column_stack(np.where(biggest(m) > 0))[:, ::-1] + [x0, y0]
        (cx, cy), (a1, a2), _ = cv2.fitEllipse(p.astype(np.float32))
        dia = (a1 + a2) / 2
        # the skin colour: the median of skin-like pixels in a ring just outside the eye
        dist = np.hypot(xx - cx, yy - cy)
        ring = (dist > dia / 2 + 5 * k) & (dist < dia / 2 + 14 * k) & (r > 200) & (g > 150) & (r - b > 40)
        px = np.median(im[ring], 0)
        boxes[name] = [round(cx / k, 2), round(cy / k, 2), round(dia / k, 2), '#%02x%02x%02x' % (int(px[2]), int(px[1]), int(px[0]))]

    boxes['size'] = [REF_W, REF_H]
    with open(os.path.join(out_dir, 'layers.json'), 'w') as f:
        json.dump(boxes, f, indent=1)
    print(json.dumps(boxes))


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
