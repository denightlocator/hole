#!/usr/bin/env python3
"""
build_clock.py — Generate the "Improved Steampunk Clock" GLB model for Bloxd.io.

Design revisions over the original reference art:
  * true 12-fold symmetry: 12 bezel teeth aligned with the hour positions
  * three satellite gears spaced exactly 120 deg apart (clock 45/165/285),
    tooth phase-locked so they mesh with the bezel without intersecting
  * regular octagon web with 8 spokes to the vertices, hexagonal centre
  * proper 12-hour marker ring (gold cardinals + mint intermediates)
  * classic 10:10 hand pose, tapered hands, stacked hour < minute < hub
  * chevrons aligned to the horizontal centreline with even spacing
  * layered relief with a navy backplate so it reads as a solid object

Outputs (same directory as this script):
  steampunk_clock.glb        wall-decoration scale (~3.6 units wide)
  steampunk_clock_item.glb   same model baked down to exactly 1.0 unit wide
  preview_front.png          orthographic front render
  preview_34.png             3/4 perspective render
  preview_comparison.png     original reference vs. new front vs. new 3/4

Limits respected (Bloxd custom model rules): glTF 2.0 binary (.glb),
embedded PBR materials only (no textures), well under 12k triangles,
well under 2 MB.
"""

import json
import math
import os
import struct

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))

# ----------------------------------------------------------------------------
# Palette (sRGB 0-255) — exact values sampled from the reference art
# ----------------------------------------------------------------------------
PAL = {
    "gold":   (255, 205,  80),  # #FFCD50 bezel ring, cardinal markers, hour hand, hub
    "face":   (  8,  70,  52),  # #084634 dark green dial
    "back":   (  9,  12,  24),  # #090C18 navy backplate (reference background)
    "mint":   ( 70, 235, 165),  # #46EBA5 centre hex, satellite cores, chevrons
    "mintlt": (190, 255, 225),  # #BEFFE1 intermediate hour markers
    "copper": (190, 130,  45),  # #BE822D bezel teeth, octagon web, spokes, sat teeth
    "brown":  ( 70,  45,  15),  # #462D0F satellite gear bodies, hub centre
    "white":  (255, 255, 255),  # minute hand
}
MAT_PROPS = {                      # material name -> (metallic, roughness)
    "gold":   (0.25, 0.40),
    "face":   (0.00, 0.85),
    "back":   (0.00, 0.90),
    "mint":   (0.00, 0.55),
    "mintlt": (0.00, 0.60),
    "copper": (0.35, 0.50),
    "brown":  (0.00, 0.90),
    "white":  (0.00, 0.50),
}

# ----------------------------------------------------------------------------
# Design parameters
# ----------------------------------------------------------------------------
# main gear / bezel
R_ROOT = 1.00          # bezel outer (tooth root) radius
R_TIP = 1.18           # tooth tip radius
R_INNER = 0.86         # bezel inner radius
N_TEETH = 12           # one tooth per hour position
TOOTH_BASE_HALF = 9.5  # deg, half angular width at root
TOOTH_TIP_HALF = 6.5   # deg, half angular width at tip
# dial
R_FACE = 0.865
R_BACK = 0.870
# hour markers
R_MARK = 0.755
CARD_LEN, CARD_W = 0.125, 0.058   # 12/3/6/9, gold
MIN_LEN, MIN_W = 0.082, 0.032     # the other eight, light mint
# inner web
R_OCT = 0.44           # octagon circumradius (outer)
R_OCT_IN = 0.40        # octagon circumradius (inner)
N_SPOKES = 8
SPOKE_W = 0.045
SPOKE_R0, SPOKE_R1 = 0.055, 0.445
# centre
R_HEX = 0.26           # mint hexagon (pointy top)
R_HUB = 0.095          # gold hub cap (pointy top)
HUB_CORE = 0.045       # dark square inset on hub
# hands — classic 10:10 pose (clock degrees, 0 = 12, clockwise)
MIN_ANGLE, MIN_LEN_H, MIN_TAIL = 60.0, 0.68, 0.11
MIN_W0, MIN_W1 = 0.070, 0.042     # hub-end width, tip width
HR_ANGLE, HR_LEN, HR_TAIL = 305.0, 0.48, 0.09
HR_W0, HR_W1 = 0.078, 0.048
# satellite gears — tooth-into-gap interlock with the bezel
# (solved numerically: min distance where a satellite tooth reaches into a
#  bezel gap without any polygon overlap; see assert_no_intersections)
SAT_DIST = 1.406
SAT_ROOT, SAT_TIP = 0.23, 0.31
SAT_BASE_HALF, SAT_TIP_HALF = 9.0, 6.0
SAT_TEETH = 8
SAT_PHASE = {45.0: 0.0, 165.0: 15.0, 285.0: 30.0}   # clock-angle -> local phase
SAT_CORE = 0.052       # mint square core half-size (~23% of body radius)
# chevrons (fast-forward accent on the 3 o'clock side), threaded on a
# copper rod that anchors them to the bezel. In the reference they float in
# empty space; mounting them on a rod turns a stray decorative glyph into a
# believable gauge/exhaust mechanism.
CHEV_A = [1.40, 1.76]   # apex x positions
CHEV_L = 0.25           # arm length
CHEV_W = 0.064          # arm thickness
ROD_X0, ROD_X1 = 0.96, 1.86   # copper mount rod span (inside bezel -> past chevrons)
ROD_H = 0.052                 # rod thickness
COLLAR_R = 0.085              # copper collar where the rod enters the bezel
# crown assembly (top, 12 o'clock)
STEM_Y0, STEM_Y1 = 1.10, 1.26   # stem spans the bezel tooth into the crown
STEM_W = 0.125
CROWN_Y, CROWN_R = 1.32, 0.130
KNURL_N, KNURL_R = 18, 0.148    # knurled copper ridges on the crown
BAIL_Y, BAIL_RO, BAIL_RI = 1.545, 0.076, 0.044
# z layers (relief depth)
Z_BACK = (-0.100, -0.060)
Z_RING = (-0.080,  0.050)
Z_FACE = (-0.060,  0.015)
Z_MARK = ( 0.012,  0.045)
Z_WEB  = ( 0.012,  0.050)
Z_SPOKE= ( 0.012,  0.045)
Z_HEX  = ( 0.020,  0.060)
Z_HOUR = ( 0.065,  0.088)
Z_MIN  = ( 0.093,  0.116)
Z_HUB  = ( 0.120,  0.150)
Z_SAT  = (-0.030,  0.050)
Z_SATC = ( 0.050,  0.075)
Z_ROD  = (-0.058, -0.008)
# winding crown + bail loop at 12 o'clock (pocket-watch signature)
# crown sits at the back of the dial plane (Z_RING is -0.080..0.050) so its
# knurls never wash out into the gold bezel behind it
Z_STEM = (-0.078,  0.002)
Z_CROWN= (-0.078,  0.000)
Z_BAIL = (-0.078, -0.010)
Z_CHEV = (-0.012,  0.048)

# ----------------------------------------------------------------------------
# Small geometry helpers
# ----------------------------------------------------------------------------
def polar(r, deg):
    a = math.radians(deg)
    return (r * math.cos(a), r * math.sin(a))


def rot2(x, y, deg):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return (x * c - y * s, x * s + y * c)


def wrap_deg(d):
    d %= 360.0
    return d + 360.0 if d < 0 else d


def point_in_poly(pt, poly):
    x, y = pt
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y):
            if x < (xj - xi) * (y - yi) / (yj - yi + 1e-300) + xi:
                inside = not inside
        j = i
    return inside


def signed_area(poly):
    a = 0.0
    n = len(poly)
    for i in range(n):
        x0, y0 = poly[i]
        x1, y1 = poly[(i + 1) % n]
        a += x0 * y1 - x1 * y0
    return 0.5 * a


def gear_outline(r_root, r_tip, n_teeth, base_half, tip_half, phase=0.0, gap_pts=2):
    """CCW gear silhouette: trapezoidal teeth on a root circle."""
    pts = []
    step = 360.0 / n_teeth
    for k in range(n_teeth):
        c = phase + k * step
        pts.append(polar(r_root, c - base_half))
        pts.append(polar(r_tip, c - tip_half))
        pts.append(polar(r_tip, c + tip_half))
        pts.append(polar(r_root, c + base_half))
        for j in range(1, gap_pts + 1):
            ang = c + base_half + j * (step - 2 * base_half) / (gap_pts + 1)
            pts.append(polar(r_root, ang))
    return pts


def circle_poly(r, n, phase=0.0):
    return [polar(r, phase + k * 360.0 / n) for k in range(n)]


def rect_poly(cx, cy, w, h, rot_deg=0.0):
    """CCW rectangle centred at (cx, cy)."""
    hw, hh = w / 2.0, h / 2.0
    corners = [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]
    return [(cx + x, cy + y) for x, y in (rot2(px, py, rot_deg) for px, py in corners)]


def hex_poly(r, pointy_top=True):
    phase = 90.0 if pointy_top else 60.0
    return [polar(r, phase + k * 60.0) for k in range(6)]


def chevron_poly(a, L, w):
    """Right-pointing '>' chevron, CCW. Arms at 45 deg, mitered tips."""
    s = math.sqrt(2.0)
    c = w / s                       # tip/notch offset along x
    hw = w / (2.0 * s)              # half-width projected on x/y at arm ends
    dx, dy = L / s, L / s           # arm end centre from apex
    T = (a + c, 0.0)
    Uo = (a - dx + hw, dy + hw)
    Ui = (a - dx - hw, dy - hw)
    I = (a - c, 0.0)
    Li = (a - dx - hw, -(dy - hw))
    Lo = (a - dx + hw, -(dy + hw))
    poly = [T, Uo, Ui, I, Li, Lo]
    if signed_area(poly) < 0:
        poly.reverse()
    return poly


# ----------------------------------------------------------------------------
# Mesh builder — keeps one triangle soup per material
# ----------------------------------------------------------------------------
class Mesh:
    def __init__(self):
        self.tris = {}          # mat -> [(p0, p1, p2), ...]

    def tri(self, mat, p0, p1, p2):
        self.tris.setdefault(mat, []).append((p0, p1, p2))

    def extrude(self, mat, poly2d, z0, z1, fan_pt=None):
        """Extrude a simple polygon. Asserts CCW input and sane fan."""
        if signed_area(poly2d) < 0:
            poly2d = list(reversed(poly2d))
        n = len(poly2d)
        if fan_pt is None:
            fan_pt = (sum(p[0] for p in poly2d) / n, sum(p[1] for p in poly2d) / n)
        # fan-centroid must be inside (star-shaped check)
        for i in range(n):
            p0, p1 = poly2d[i], poly2d[(i + 1) % n]
            ctr = ((fan_pt[0] + p0[0] + p1[0]) / 3.0, (fan_pt[1] + p0[1] + p1[1]) / 3.0)
            assert point_in_poly(ctr, poly2d), f"fan triangle escapes polygon at {i}"
        fp = (fan_pt[0], fan_pt[1])
        # caps
        for i in range(n):
            a, b = poly2d[i], poly2d[(i + 1) % n]
            self.tri(mat, (fp[0], fp[1], z1), (a[0], a[1], z1), (b[0], b[1], z1))
            self.tri(mat, (fp[0], fp[1], z0), (b[0], b[1], z0), (a[0], a[1], z0))
        # walls
        for i in range(n):
            a, b = poly2d[i], poly2d[(i + 1) % n]
            self.tri(mat, (a[0], a[1], z0), (b[0], b[1], z0), (b[0], b[1], z1))
            self.tri(mat, (a[0], a[1], z0), (b[0], b[1], z1), (a[0], a[1], z1))

    def extrude_ring(self, mat, outer, inner, z0, z1):
        """Extrude an annulus; outer/inner must have matching vertex count and
        the same angular order (both CCW) so strip quads stay untwisted."""
        if signed_area(outer) < 0:
            outer = list(reversed(outer))
        if signed_area(inner) < 0:
            inner = list(reversed(inner))
        n = len(outer)
        assert n == len(inner)
        # caps as strip quads
        for i in range(n):
            j = (i + 1) % n
            oi, oj = outer[i], outer[j]
            ii, ij = inner[i], inner[j]
            # top (+z)
            self.tri(mat, (ii[0], ii[1], z1), (oi[0], oi[1], z1), (oj[0], oj[1], z1))
            self.tri(mat, (ii[0], ii[1], z1), (oj[0], oj[1], z1), (ij[0], ij[1], z1))
            # bottom (-z)
            self.tri(mat, (ii[0], ii[1], z0), (oj[0], oj[1], z0), (oi[0], oi[1], z0))
            self.tri(mat, (ii[0], ii[1], z0), (ij[0], ij[1], z0), (oj[0], oj[1], z0))
            # outer wall (outward)
            self.tri(mat, (oi[0], oi[1], z0), (oj[0], oj[1], z0), (oj[0], oj[1], z1))
            self.tri(mat, (oi[0], oi[1], z0), (oj[0], oj[1], z1), (oi[0], oi[1], z1))
            # inner wall (faces the hole)
            self.tri(mat, (ij[0], ij[1], z0), (ii[0], ii[1], z0), (ii[0], ii[1], z1))
            self.tri(mat, (ij[0], ij[1], z0), (ii[0], ii[1], z1), (ij[0], ij[1], z1))

    def shift(self, dx, dy, dz=0.0):
        for lst in self.tris.values():
            out = []
            for p0, p1, p2 in lst:
                out.append(tuple((p[0] + dx, p[1] + dy, p[2] + dz) for p in (p0, p1, p2)))
            lst[:] = out

    def scale(self, s):
        for lst in self.tris.values():
            out = []
            for p0, p1, p2 in lst:
                out.append(tuple((p[0] * s, p[1] * s, p[2] * s) for p in (p0, p1, p2)))
            lst[:] = out

    def bounds(self):
        xs, ys, zs = [], [], []
        for lst in self.tris.values():
            for p0, p1, p2 in lst:
                for p in (p0, p1, p2):
                    xs.append(p[0]); ys.append(p[1]); zs.append(p[2])
        return min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)

    def triangle_count(self):
        return sum(len(v) for v in self.tris.values())

    def signed_volume(self):
        """Divergence theorem — positive means consistent outward winding."""
        vol = 0.0
        for lst in self.tris.values():
            for p0, p1, p2 in lst:
                vol += (p0[0] * (p1[1] * p2[2] - p2[1] * p1[2])
                        - p0[1] * (p1[0] * p2[2] - p2[0] * p1[2])
                        + p0[2] * (p1[0] * p2[1] - p2[0] * p1[1])) / 6.0
        return vol


# ----------------------------------------------------------------------------
# Build the clock
# ----------------------------------------------------------------------------
def clock_math_angle(clock_deg):
    """clock: 0 = 12 o'clock, clockwise  ->  math: 0 = +x, counter-clockwise."""
    return 90.0 - clock_deg


def build():
    m = Mesh()

    # --- backplate ---------------------------------------------------------
    m.extrude("back", circle_poly(R_BACK, 96), Z_BACK[0], Z_BACK[1])

    # --- bezel: gold ring + copper teeth (two-tone, like the original) -----
    # ring: smooth annulus from R_INNER to R_ROOT
    ring_out = circle_poly(R_ROOT, 96)
    ring_in = circle_poly(R_INNER, 96)
    m.extrude_ring("gold", ring_out, ring_in, Z_RING[0], Z_RING[1])
    # teeth: 12 individual trapezoids in copper, one per hour position
    for k in range(N_TEETH):
        c = clock_math_angle(0.0) + k * (360.0 / N_TEETH)
        tooth = [polar(R_ROOT, c - TOOTH_BASE_HALF),
                 polar(R_TIP, c - TOOTH_TIP_HALF),
                 polar(R_TIP, c + TOOTH_TIP_HALF),
                 polar(R_ROOT, c + TOOTH_BASE_HALF)]
        m.extrude("copper", tooth, Z_RING[0], Z_RING[1])

    # --- dial --------------------------------------------------------------
    m.extrude("face", circle_poly(R_FACE, 96), Z_FACE[0], Z_FACE[1])

    # --- hour markers ------------------------------------------------------
    for h in range(12):
        ang = h * 30.0                      # clock degrees
        phi = clock_math_angle(ang)         # math angle of the marker position
        if h % 3 == 0:
            mat, length, width = "gold", CARD_LEN, CARD_W
        else:
            mat, length, width = "mintlt", MIN_LEN, MIN_W
        # rect local +x = radial, centred at R_MARK, then rotated into place
        poly = rect_poly(R_MARK, 0.0, length, width, 0.0)
        poly = [(x, y) for x, y in (rot2(px, py, phi) for px, py in poly)]
        m.extrude(mat, poly, Z_MARK[0], Z_MARK[1])

    # --- octagon web + spokes ---------------------------------------------
    # vertices at 12 / 1:30 / 3 / ... -> math angles 90 + 45k
    oct_out = [polar(R_OCT, 90.0 + k * 45.0) for k in range(8)]
    oct_in = [polar(R_OCT_IN, 90.0 + k * 45.0) for k in range(8)]
    m.extrude_ring("copper", oct_out, oct_in, Z_WEB[0], Z_WEB[1])
    for k in range(N_SPOKES):
        phi = 90.0 + k * (360.0 / N_SPOKES)
        mid = (SPOKE_R0 + SPOKE_R1) / 2.0
        poly = rect_poly(mid, 0.0, SPOKE_R1 - SPOKE_R0, SPOKE_W, 0.0)
        poly = [(x, y) for x, y in (rot2(px, py, phi) for px, py in poly)]
        m.extrude("copper", poly, Z_SPOKE[0], Z_SPOKE[1])

    # --- centre hexagon + hub ---------------------------------------------
    m.extrude("mint", hex_poly(R_HEX), Z_HEX[0], Z_HEX[1])
    m.extrude("gold", hex_poly(R_HUB), Z_HUB[0], Z_HUB[1])
    # dark square pin at the very centre (matches the reference's hub detail)
    m.extrude("brown", rect_poly(0.0, 0.0, HUB_CORE * 2, HUB_CORE * 2, 0.0),
              Z_HUB[1], Z_HUB[1] + 0.012)

    # --- hands (hour below minute below hub) -------------------------------
    # The reference's hands sit on copper spokes at almost identical value,
    # so the hands disappear against the web. Each hand therefore gets a
    # slightly oversized dark silhouette underneath it, which reads as a
    # drop shadow and guarantees separation from the mint centre and the
    # copper spokes at any zoom level.
    OUTLINE_PAD_W, OUTLINE_PAD_L = 0.026, 0.014   # extra width / length (units)

    def hand_poly(angle_clock, length, tail, w0, w1, pad_w=0.0, pad_l=0.0):
        poly = [(-tail - pad_l, -(w0 + pad_w) / 2), (length + pad_l, -(w1 + pad_w) / 2),
                (length + pad_l, (w1 + pad_w) / 2), (-tail - pad_l, (w0 + pad_w) / 2)]
        phi = clock_math_angle(angle_clock)
        return [(x, y) for x, y in (rot2(px, py, phi) for px, py in poly)]

    def hand(angle_clock, length, tail, w0, w1, z0, z1, mat):
        m.extrude("brown", hand_poly(angle_clock, length, tail, w0, w1,
                                     OUTLINE_PAD_W, OUTLINE_PAD_L),
                  z0, z0 + 0.010)
        m.extrude(mat, hand_poly(angle_clock, length, tail, w0, w1),
                  z0 + 0.010, z1)

    hand(HR_ANGLE, HR_LEN, HR_TAIL, HR_W0, HR_W1, Z_HOUR[0], Z_HOUR[1], "gold")
    hand(MIN_ANGLE, MIN_LEN_H, MIN_TAIL, MIN_W0, MIN_W1, Z_MIN[0], Z_MIN[1], "white")

    # --- satellite gears (brown body + copper teeth + mint square core) ----
    for clk, phase in SAT_PHASE.items():
        phi_pos = clock_math_angle(clk)
        cx, cy = polar(SAT_DIST, phi_pos)
        # brown octagonal body
        body = [(x + cx, y + cy) for x, y in circle_poly(SAT_ROOT, 8, phase)]
        m.extrude("brown", body, Z_SAT[0], Z_SAT[1])
        # 8 copper teeth pinned to the body
        step = 360.0 / SAT_TEETH
        for k in range(SAT_TEETH):
            c = phase + k * step
            tooth = [polar(SAT_ROOT - 0.01, c - SAT_BASE_HALF),
                     polar(SAT_TIP, c - SAT_TIP_HALF),
                     polar(SAT_TIP, c + SAT_TIP_HALF),
                     polar(SAT_ROOT - 0.01, c + SAT_BASE_HALF)]
            world = [(x + cx, y + cy) for x, y in tooth]
            m.extrude("copper", world, Z_SAT[0], Z_SAT[1])
        # mint square core (axis-aligned, as in the reference)
        core = [(x + cx, y + cy) for x, y in
                rect_poly(0.0, 0.0, SAT_CORE * 2, SAT_CORE * 2, 0.0)]
        m.extrude("mint", core, Z_SATC[0], Z_SATC[1])

    # --- winding crown + bail loop (12 o'clock) ---------------------------
    m.extrude("gold", rect_poly(0.0, (STEM_Y0 + STEM_Y1) / 2.0, STEM_W,
                                STEM_Y1 - STEM_Y0, 0.0), Z_STEM[0], Z_STEM[1])
    m.extrude("gold", circle_poly(CROWN_R, 20, 90.0), Z_CROWN[0], Z_CROWN[1])
    # knurled ridges, then re-cap the crown centre so the ridges look machined
    stepk = 360.0 / KNURL_N
    for k in range(KNURL_N):
        phi = 90.0 + k * stepk
        ridge = [polar(CROWN_R * 0.62, phi - stepk * 0.33),
                 polar(KNURL_R, phi - stepk * 0.16),
                 polar(KNURL_R, phi + stepk * 0.16),
                 polar(CROWN_R * 0.62, phi + stepk * 0.33)]
        ridge = [(x, y + CROWN_Y) for x, y in ridge]
        m.extrude("copper", ridge, Z_CROWN[0], Z_CROWN[1])
    # bail loop
    bail_o = circle_poly(BAIL_RO, 40)
    bail_i = circle_poly(BAIL_RI, 40)
    bail_o = [(x, y + BAIL_Y) for x, y in bail_o]
    bail_i = [(x, y + BAIL_Y) for x, y in bail_i]
    m.extrude_ring("gold", bail_o, bail_i, Z_BAIL[0], Z_BAIL[1])

    # --- chevrons on their mount rod ---------------------------------------
    # rod runs along y=0, sitting just behind the chevrons
    m.extrude("copper", rect_poly((ROD_X0 + ROD_X1) / 2.0, 0.0,
                                 ROD_X1 - ROD_X0, ROD_H, 0.0),
              Z_ROD[0], Z_ROD[1])
    # collar at the bezel end so the rod looks bolted on
    m.extrude("copper", circle_poly(COLLAR_R, 24), Z_ROD[0], Z_ROD[1])
    for a in CHEV_A:
        # explicit fan point: the vertex-average of a chevron falls in the
        # concave notch, which would fail the star-shapedness assertion
        m.extrude("mint", chevron_poly(a, CHEV_L, CHEV_W), Z_CHEV[0], Z_CHEV[1],
                  fan_pt=(a, 0.0))

    # --- sanity ------------------------------------------------------------
    vol = m.signed_volume()
    assert vol > 0, f"non-outward winding (volume {vol:.4f})"
    assert_no_intersections(m)
    return m


def gear_radius_at(r_root, r_tip, n_teeth, base_half, tip_half, phase, theta_deg):
    """Radial extent of a gear silhouette at math angle theta (for collision)."""
    step = 360.0 / n_teeth
    local = wrap_deg(theta_deg - phase)
    k = math.floor(local / step + 0.5)
    c = k * step
    d = abs(local - c)
    if d <= tip_half:
        return r_tip
    if d <= base_half:
        # linear taper between tip and root
        t = (base_half - d) / max(base_half - tip_half, 1e-9)
        return r_root + (r_tip - r_root) * t
    return r_root


def assert_no_intersections(m):
    """Sampled solid-vs-solid check: satellite gears vs. the main bezel.

    The bezel is now a smooth gold ring [R_INNER, R_ROOT] plus 12 copper
    teeth reaching R_TIP. The satellites are built from a brown octagon body
    plus 8 copper teeth, so the collision silhouette is the same gear shape.
    """
    BEZEL_PHASE = clock_math_angle(0.0)
    for clk, phase in SAT_PHASE.items():
        phi_pos = clock_math_angle(clk)
        cx, cy = polar(SAT_DIST, phi_pos)
        outline = gear_outline(SAT_ROOT, SAT_TIP, SAT_TEETH, SAT_BASE_HALF, SAT_TIP_HALF, phase, 1)
        # satellite vertices must not land inside the bezel solid
        for x, y in outline:
            wx, wy = x + cx, y + cy
            r = math.hypot(wx, wy)
            th = math.degrees(math.atan2(wy, wx))
            rb = gear_radius_at(R_ROOT, R_TIP, N_TEETH, TOOTH_BASE_HALF,
                                TOOTH_TIP_HALF, BEZEL_PHASE, th)
            if R_INNER < r < rb:
                raise AssertionError(
                    f"satellite @{clk} deg pokes into bezel at r={r:.3f} (th={th:.1f})")
        # bezel vertices must not land inside a satellite body
        main_out = gear_outline(R_ROOT, R_TIP, N_TEETH, TOOTH_BASE_HALF,
                                TOOTH_TIP_HALF, BEZEL_PHASE)
        main_out.append(circle_poly(R_ROOT, 96))
        flat = []
        for item in main_out:
            if isinstance(item, tuple):
                flat.append(item)
            else:
                flat.extend(item)
        for x, y in flat:
            dx, dy = x - cx, y - cy
            r = math.hypot(dx, dy)
            if r > SAT_TIP:
                continue
            th = math.degrees(math.atan2(dy, dx))
            rb = gear_radius_at(SAT_ROOT, SAT_TIP, SAT_TEETH, SAT_BASE_HALF, SAT_TIP_HALF, phase, th)
            if r < rb:
                raise AssertionError(
                    f"bezel vertex inside satellite @{clk} deg (r={r:.3f} rb={rb:.3f})")
        # A satellite TOOTH must aim at the main gear (it enters a bezel gap),
        # and that same direction must be a bezel GAP centre. Tooth-into-gap
        # is what makes the two read as a real meshed gear train.
        contact_local = wrap_deg(phi_pos + 180.0)
        sat_tooth_centers = [wrap_deg(phase + i * 45.0) for i in range(SAT_TEETH)]
        best = min(abs((contact_local - g + 180.0) % 360.0 - 180.0)
                   for g in sat_tooth_centers)
        assert best < 1e-6, f"satellite @{clk}: contact {contact_local:.2f} is not a tooth"
        contact_main = phi_pos
        bezel_gaps = [clock_math_angle(15.0 + i * 30.0) for i in range(12)]
        best = min(abs((contact_main - g + 180.0) % 360.0 - 180.0) for g in bezel_gaps)
        assert best < 1e-6, f"satellite @{clk}: bezel contact not in a gap"


# ----------------------------------------------------------------------------
# GLB writer (raw glTF 2.0 binary, no external deps)
# ----------------------------------------------------------------------------
def write_glb(path, mesh, scale_note=""):
    mat_names = [k for k in PAL if k in mesh.tris]   # stable order from PAL

    bin_chunks = []
    buffer_views = []
    accessors = []
    primitives = []
    byte_off = 0

    def add_view(data_bytes):
        nonlocal byte_off
        while byte_off % 4:
            bin_chunks.append(b"\x00")
            byte_off += 1
        bin_chunks.append(data_bytes)
        view = {"buffer": 0, "byteOffset": byte_off, "byteLength": len(data_bytes),
                "target": 34962}
        buffer_views.append(view)
        byte_off += len(data_bytes)
        return len(buffer_views) - 1

    total_tris = 0
    for mat in mat_names:
        tris = mesh.tris[mat]
        total_tris += len(tris)
        pos = []
        nrm = []
        for p0, p1, p2 in tris:
            ux = (p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])
            vx = (p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2])
            nx = ux[1] * vx[2] - ux[2] * vx[1]
            ny = ux[2] * vx[0] - ux[0] * vx[2]
            nz = ux[0] * vx[1] - ux[1] * vx[0]
            ln = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
            nx, ny, nz = nx / ln, ny / ln, nz / ln
            for p in (p0, p1, p2):
                pos.extend((p[0], p[1], p[2]))
                nrm.extend((nx, ny, nz))
        pos_b = struct.pack(f"<{len(pos)}f", *pos)
        nrm_b = struct.pack(f"<{len(nrm)}f", *nrm)
        pv = add_view(pos_b)
        nv = add_view(nrm_b)
        count = len(tris) * 3
        xs = pos[0::3]; ys = pos[1::3]; zs = pos[2::3]
        acc_p = {"bufferView": pv, "componentType": 5126, "count": count,
                 "type": "VEC3",
                 "min": [min(xs), min(ys), min(zs)],
                 "max": [max(xs), max(ys), max(zs)]}
        acc_n = {"bufferView": nv, "componentType": 5126, "count": count,
                 "type": "VEC3"}
        accessors.append(acc_p)
        accessors.append(acc_n)
        primitives.append({
            "attributes": {"POSITION": len(accessors) - 2, "NORMAL": len(accessors) - 1},
            "material": mat_names.index(mat),
            "mode": 4,
        })

    bin_bytes = b"".join(bin_chunks)
    gltf = {
        "asset": {"version": "2.0",
                  "generator": "Bloxd steampunk clock generator",
                  "extras": {"design": "improved steampunk clock",
                             "triangleCount": total_tris,
                             "note": scale_note}},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"name": "generated(Clone)", "mesh": 0}],
        "meshes": [{"name": "SteampunkClock", "primitives": primitives}],
        "materials": [
            {"name": n,
             "pbrMetallicRoughness": {
                 "baseColorFactor": [PAL[n][0] / 255, PAL[n][1] / 255,
                                     PAL[n][2] / 255, 1.0],
                 "metallicFactor": MAT_PROPS[n][0],
                 "roughnessFactor": MAT_PROPS[n][1]},
             "doubleSided": True}
            for n in mat_names
        ],
        "bufferViews": buffer_views,
        "accessors": accessors,
        "buffers": [{"byteLength": len(bin_bytes)}],
    }
    json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4:
        json_bytes += b" "

    total = 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(json_bytes), 0x4E4F534A))
        f.write(json_bytes)
        f.write(struct.pack("<II", len(bin_bytes), 0x004E4942))
        f.write(bin_bytes)
    return total_tris, total


# ----------------------------------------------------------------------------
# Preview renderer — painter's algorithm with flat shading (PIL)
# ----------------------------------------------------------------------------
BG = (10, 14, 26)
LIGHT = None  # set per view


def _norm(v):
    l = math.sqrt(sum(c * c for c in v)) or 1.0
    return tuple(c / l for c in v)


def render_view(mesh, size, yaw=0.0, pitch=0.0, supersample=2, label=None):
    """Orthographic render with a real z-buffer.

    A painter's-algorithm pass is not enough here: hands sit a few hundredths
    of a unit above the dial and overlap long thin triangles, which sorts
    incorrectly and shreds the image. This rasterises each triangle into the
    supersampled framebuffer and resolves per-pixel depth with a bisection.
    """
    import numpy as np

    cy_, sy_ = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    cx_, sx_ = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))
    light = _norm((-0.35, 0.55, 0.75))

    def xform(p):
        x, y, z = p
        x, z = x * cy_ + z * sy_, -x * sy_ + z * cy_
        y, z = y * cx_ - z * sx_, y * sx_ + z * cx_
        return np.array([x, y, z], dtype=np.float64)

    x0, x1, y0, y1, _, _ = mesh.bounds()
    corners = [xform((x, y, z)) for x in (x0, x1) for y in (y0, y1) for z in (-0.2, 0.2)]
    minx = min(c[0] for c in corners); maxx = max(c[0] for c in corners)
    miny = min(c[1] for c in corners); maxy = max(c[1] for c in corners)
    span = max(maxx - minx, maxy - miny) * 1.10
    cxx, cyy = (minx + maxx) / 2, (miny + maxy) / 2

    S = size * supersample
    color = np.zeros((S, S, 3), dtype=np.float32)
    color[:] = BG
    zbuf = np.full((S, S), -1e9, dtype=np.float64)

    ys, xs = np.mgrid[0:S, 0:S]

    for mat, lst in mesh.tris.items():
        base = np.array(PAL[mat], dtype=np.float32)
        for p0, p1, p2 in lst:
            q0, q1, q2 = xform(p0), xform(p1), xform(p2)
            u = q1 - q0
            v = q2 - q0
            n = np.cross(u, v)
            ln = np.linalg.norm(n)
            if ln < 1e-12:
                continue
            n = n / ln
            if n[2] <= 0.0:
                continue                                  # backface
            # screen coords (y flipped) for the 3 verts
            px = (q0[0] - cxx) / span * S + S / 2
            py = S / 2 - (q0[1] - cyy) / span * S
            faces = []
            for q in (q0, q1, q2):
                faces.append(((q[0] - cxx) / span * S + S / 2,
                              S / 2 - (q[1] - cyy) / span * S))
            (ax, ay), (bx, by), (ccx, ccy) = faces
            xlo = max(int(math.floor(min(ax, bx, ccx))), 0)
            xhi = min(int(math.ceil(max(ax, bx, ccx))), S - 1)
            ylo = max(int(math.floor(min(ay, by, ccy))), 0)
            yhi = min(int(math.ceil(max(ay, by, ccy))), S - 1)
            if xlo > xhi or ylo > yhi:
                continue
            gx = xs[ylo:yhi + 1, xlo:xhi + 1] + 0.5
            gy = ys[ylo:yhi + 1, xlo:xhi + 1] + 0.5
            den = (by - ccy) * (ax - ccx) + (ccx - bx) * (ay - ccy)
            if abs(den) < 1e-12:
                continue
            w0 = ((by - ccy) * (gx - ccx) + (ccx - bx) * (gy - ccy)) / den
            w1 = ((ccy - ay) * (gx - ccx) + (ax - ccx) * (gy - ccy)) / den
            w2 = 1.0 - w0 - w1
            mask = (w0 >= -1e-9) & (w1 >= -1e-9) & (w2 >= -1e-9)
            if not mask.any():
                continue
            depth = w0 * q0[2] + w1 * q1[2] + w2 * q2[2]
            sub = zbuf[ylo:yhi + 1, xlo:xhi + 1]
            take = mask & (depth > sub)
            if not take.any():
                continue
            sub[take] = depth[take]
            inten = 0.45 + 0.55 * max(0.0, float(n @ np.array(light)))
            shade = np.clip(base * inten, 0, 255)
            csub = color[ylo:yhi + 1, xlo:xhi + 1]
            csub[take] = shade

    img = Image.fromarray(color.astype(np.uint8), "RGB")
    if label:
        draw = ImageDraw.Draw(img)
        font = ImageFont.load_default(size=26 * supersample)
        draw.text((18 * supersample, 14 * supersample), label,
                  fill=(230, 235, 245), font=font)
    return img.resize((size, size), Image.LANCZOS)


PACK_NAME = "steampunkClock"
PACK_TARGET = "Compass"      # default-pack model this pack overrides


def write_pack_json(pack_dir, glb_path):
    """Write the texture-pack manifest.

    Mirrors github.com/Bloxdy/texture-packs scripts/update-texture-pack.js so
    the pack works without running npm: modelOverrides is keyed by the file
    name up to its first dot, and each value is a base64 data URL.
    """
    import base64
    with open(glb_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    pack = {
        "metaData": {"id": PACK_NAME, "version": 1},
        "textureOverrides": {},
        "skyBoxes": {},
        "modelOverrides": {PACK_TARGET: f"data:application/octet-stream;base64,{b64}"},
        "customCss": {"fontFaces": [], "classStyles": {}},
    }
    os.makedirs(pack_dir, exist_ok=True)
    out = os.path.join(pack_dir, f"{PACK_NAME}.json")
    with open(out, "w") as f:
        json.dump(pack, f, indent=4)
    return out, len(b64)


def main():
    mesh = build()
    vol = mesh.signed_volume()
    x0, x1, y0, y1, z0, z1 = mesh.bounds()
    w, h, d = x1 - x0, y1 - y0, z1 - z0

    # centre on X/Y (keep z as built)
    mesh.shift(-(x0 + x1) / 2, -(y0 + y1) / 2)

    tris, size_b = write_glb(os.path.join(HERE, "steampunk_clock.glb"), mesh,
                             scale_note=f"wall scale, {w:.2f}x{h:.2f}x{d:.2f} units")

    # Item variant: bake into Bloxd's standard item-model box.
    # Convention measured from the default pack (Apple, Arrow, Ball, Banana,
    # Diamond Sword): POSITION bounds x,y in [-4, 4], z (depth) in [-0.5, 0.5].
    item = build()
    ix0, ix1, iy0, iy1, _, _ = item.bounds()
    item.shift(-(ix0 + ix1) / 2, -(iy0 + iy1) / 2, -(item.bounds()[4] + item.bounds()[5]) / 2)
    span = max(ix1 - ix0, iy1 - iy0)
    s = 8.0 / span                     # fit the 8-unit item footprint
    item.scale(s)
    # keep depth inside +-0.5 by squeezing z only (relief is decorative)
    z0, z1 = item.bounds()[4], item.bounds()[5]
    if max(abs(z0), abs(z1)) > 0.5:
        sz = 0.5 / max(abs(z0), abs(z1))
        for lst in item.tris.values():
            lst[:] = [tuple((p[0], p[1], p[2] * sz) for p in tri) for tri in lst]
    tris_i, size_i = write_glb(os.path.join(HERE, "steampunk_clock_item.glb"), item,
                               scale_note=f"item scale x{s:.4f}, 8x8x1 Bloxd box")

    print(f"wall GLB : {tris} tris, {size_b/1024:.1f} KB")
    print(f"item GLB : {tris_i} tris, {size_i/1024:.1f} KB")
    print(f"bounds   : {w:.3f} x {h:.3f} x {d:.3f} units (before centring)")
    print(f"volume   : {vol:.4f} (outward-wound)")

    # texture-pack drop-in: models/<Compass>.glb + _json/<pack>.json
    pack_dir = os.path.join(HERE, "pack")
    os.makedirs(os.path.join(pack_dir, "models"), exist_ok=True)
    os.makedirs(os.path.join(pack_dir, "_json"), exist_ok=True)
    packed_glb = os.path.join(pack_dir, "models", f"{PACK_TARGET}.glb")
    with open(os.path.join(HERE, "steampunk_clock_item.glb"), "rb") as src, \
            open(packed_glb, "wb") as dst:
        dst.write(src.read())
    json_out, b64len = write_pack_json(os.path.join(pack_dir, "_json"), packed_glb)
    print(f"pack     : {os.path.relpath(packed_glb, HERE)} + "
          f"{os.path.relpath(json_out, HERE)} ({b64len/1024:.1f} KB base64)")

    # previews from the centred wall model
    front = render_view(mesh, 1080, yaw=0, pitch=0, label="front")
    view34 = render_view(mesh, 1080, yaw=-30, pitch=16, label="3/4 view")
    front.save(os.path.join(HERE, "preview_front.png"))
    view34.save(os.path.join(HERE, "preview_34.png"))

    # comparison against the original reference art
    ref_path = "/tmp/arena-coding-uploads/supersuperdupercoolclock.png"
    if os.path.exists(ref_path):
        ref = Image.open(ref_path).convert("RGB").resize((1080, 1080), Image.LANCZOS)
        comp = Image.new("RGB", (1080 * 3, 1080), BG)
        comp.paste(ref, (0, 0))
        comp.paste(front, (1080, 0))
        comp.paste(view34, (2160, 0))
        draw = ImageDraw.Draw(comp)
        font = ImageFont.load_default(size=30)
        for i, lab in enumerate(("original", "improved - front", "improved - 3/4")):
            draw.text((i * 1080 + 20, 1030), lab, fill=(240, 240, 245), font=font)
        comp.save(os.path.join(HERE, "preview_comparison.png"))
        print("wrote preview_comparison.png")


if __name__ == "__main__":
    main()
