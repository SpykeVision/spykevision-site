---
title: XGIMI Titan Noir Max — Lens Quality, Brightness & Contrast
eyebrow: In-Depth Review · Part 2
category: 4K Laser • Flagship
summary: Lens quality, brightness and contrast measurements for the XGIMI Titan Noir Max. Native, ANSI and ADL contrast across the full zoom range.
cover: /images/brightness.png
date: 2026-06-01
readTime: 18 min read
extra: Firmware 1.0.99
score: 9.2
draft: false
pros:
  - True 0.98–2.1x optical zoom, no add-on lens needed
  - Dual-iris system enables class-leading native contrast (up to 8,650:1)
  - Outstanding lens sharpness, near-4K crosshatch
  - Excellent geometry, no barrel distortion at extremes
  - H/V lens shift & sealed optical block
cons:
  - Hidden sharpness processing at slider 0
  - 240 Hz XPR, SDE on par with older models
  - Uniformity varies with zoom/shift on my sample
  - Laser throttling on sustained white fields
ratings:
  - { label: Brightness, score: 9.6 }
  - { label: Contrast, score: 9.2 }
  - { label: Lens / optics, score: 9.4 }
  - { label: Sharpness, score: 8.8 }
  - { label: Value, score: 8.6 }
verdictTitle: A measurement-backed flagship
verdictText: The Titan Noir Max combines a genuinely versatile lens with a dual-iris contrast system that, on paper and on the bench, delivers the goods. A few firmware-fixable quirks keep it from perfection, but this is one of the most capable home-theater projectors available today.
---

Hey everyone, Part 2 is finally here. I put a significant amount of work into the measurements and testing for the Titan Noir Max (TNM), so let's get right into it. This part covers the lens, the optics, and the full brightness and contrast workup.

## The Lens

The Titan Noir Max ships with XGIMI's top-tier lens, identifiable by the distinctive **red ring**. It comprises multiple glass elements and, most importantly for enthusiasts, features a true optical zoom covering throw ratios from **0.98 to 2.0** (extended to **2.1x** with firmware 1.0.99).

This is a big deal. Unlike competitors that top out at a narrow zoom range and force you to buy a separate long-throw accessory, XGIMI has finally acknowledged that not everyone has a dedicated theater room. Regular living rooms are now fully in scope without any add-ons. The lens also gained both **horizontal and vertical lens shift**, which dramatically simplifies installation.

On the front fascia there's a protective glass element bearing the **IMAX Enhanced** logo in gold (the Pro variant uses silver). Below it sit three sensors: a ToF rangefinder for autofocus, an ambient light sensor for automatic brightness, and a person-detection sensor that cuts the laser if someone moves into the beam path. All three can be disabled in the menu.

XGIMI claims the optical block is **fully sealed** against dust. In practice this means contrast figures should hold at spec for the lifetime of the unit, rather than degrading as dust settles on the DMD or optics. A meaningful long-term reliability claim.

## Two-Iris System

One of the most technically interesting aspects of the TNM is the **dual-aperture design**. There are two independently controlled irises: one positioned immediately after the laser assembly (behind the first mirror), and one inside the lens itself, capable of operating dynamically when Dynamic mode is selected.

This approach was previously seen in the Dangbei S7, where it proved highly effective for contrast. The results here are similarly impressive, but there are important nuances, which the measurements below make clear.

## Distortion & Geometry

I ran a full distortion evaluation and found **no meaningful issues**. A laser level placed along the screen edge confirms straight lines even at maximum lens shift and minimum zoom, something several competitors struggle with due to barrel distortion. There's a minor deviation at the very center, but it's negligible for real content. Geometry accuracy here is simply excellent.

<figure><img src="/images/analysis.png" alt="Lens geometry and combined analysis"><figcaption>Combined optical analysis across zoom and aperture.</figcaption></figure>

## XPR Pixel-Shift & Sharpness

Despite the new SST chip and revised controller, XPR still operates at **240&nbsp;Hz**, the same cadence as older projectors like the Valerion Max. The screen-door effect is consequently at the same level. If anything it's marginally more noticeable here, because the TNM is significantly brighter and the lens resolves more detail. Hopefully XGIMI can push the shift frequency higher in a future firmware.

The good news: sharpness on this lens is **outstanding**, among the best I've seen in this class. On a crosshatch resolution pattern, performance sits close to full 4K, not quite passing 100%, but approaching it. On a QBF pattern in Game mode the image is impressively crisp.

<div class="note"><strong>One caveat:</strong> there appears to be hidden sharpness processing active even with the sharpness slider at 0. For reference-grade calibration, processed edges shouldn't exist when sharpening is disabled. I hope XGIMI addresses this in a future firmware.</div>

## White Uniformity

My unit shows some uniformity variation: the left edge runs slightly pink, the upper-right corner pushes green. But here's the key point: **uniformity is heavily influenced by zoom, lens shift, aperture and operating temperature.** At 2.1x (max telephoto) it's at its worst on my sample; at 1.3x with a modest shift, it's nearly perfect.

Practical advice: if the uniformity bothers you, spend ten minutes adjusting placement, zoom and shift before assuming you have a defective unit. The improvement can be dramatic. No software fix required.

## Brightness Measurements

<div class="note"><strong>Laser throttling:</strong> on a sustained full-white field, output began dropping at ~2&nbsp;min and stabilized by ~15&nbsp;min, falling from roughly <strong>400&nbsp;lux to 350&nbsp;lux (~12.5%)</strong>. In real content this is virtually impossible to trigger, but for measurements it matters: don't park the projector on a white field or your data will drift.</div>

This projector is genuinely bright. But the figure you get depends on three variables: **zoom position, lens shift, and aperture**. All charts below were taken with the lens **centered**, which yields maximum brightness; shifting the lens trades brightness for contrast.

<figure><img src="/images/brightness.png" alt="Brightness by zoom and aperture"><figcaption>Lumens across the full zoom range, by aperture. ISF Night / D65, Laser 10.</figcaption></figure>

**What the data reveals: the dual iris is doing something clever.** Total luminous flux stays roughly constant across the entire zoom range at a given aperture: whether you're at 1.0x or 2.1x, F2 delivers ~**4,000–4,200&nbsp;lm** in ISF Night. The lux reading changes (you're spreading the same light over a different screen size) but total output doesn't. The primary iris after the laser appears to compensate as you zoom, keeping a consistent brightness envelope.

The practical upshot: **zoom position changes your screen size, not your total brightness.** Pick the zoom that fits your room. Aperture, by contrast, is the real tradeoff dial: moving F2&nbsp;→&nbsp;F7 cuts brightness ~80–85%, but buys a dramatic contrast return, especially at longer zoom.

<table class="spec-table">
<tr><td>Performance mode, F2</td><td>≈ 7,600 lm (peak ceiling)</td></tr>
<tr><td>ISF Night / Laser 10, F2</td><td>≈ 4,100 lm (reference baseline)</td></tr>
<tr><td>ISF Night, F4 @ 1.5x</td><td>≈ 2,700 lm · 4,579:1 native</td></tr>
<tr><td>ISF Night, F7 @ 2.1x</td><td>≈ 700 lm · 8,650:1 native</td></tr>
</table>

## Contrast: Native, ANSI & ADL

Native (on/off) contrast is where the dual-iris design shines. Stopping the lens iris down from F2 to F7 multiplies native contrast several times over, and the effect **grows with zoom**. At 1.0x the F7/F2 gain is about ×2.3; at 2.1x it reaches ×5.2, peaking at a remarkable **8,650:1** native.

<figure><img src="/images/contrast.png" alt="Native contrast by zoom and aperture"><figcaption>Native contrast across zoom and aperture, with the peak position highlighted per aperture.</figcaption></figure>

Combining brightness and contrast into a single quality metric (lm × contrast), the "sweet spot" isn't maximum aperture; it's the mid-range. **F4–F5.5 around 1.5x** delivers the best simultaneous brightness and contrast for most rooms.

<figure><img src="/images/quality.png" alt="Combined brightness × contrast quality metric"><figcaption>Brightness × contrast quality score, with the best zoom per aperture.</figcaption></figure>

**ANSI contrast** tells the in-room story. Here the lens position is decisive: **shifting the lens improves ANSI by roughly 15–20%** versus centered, because the shifted ray path reduces internal stray light. ANSI also falls as you zoom in, from ~840:1 at 1.0x down to ~550:1 at 2.0x.

<figure><img src="/images/ansi.png" alt="ANSI contrast, shifted vs centered lens"><figcaption>ANSI contrast: shifted lens (solid) vs centered (dashed), F2/F5.5/F7.</figcaption></figure>

Finally, **ADL** (average display level) contrast shows how black level behaves with real content. Contrast is highest on dark scenes (low ADL) and falls as the picture brightens, converging on the ANSI figure at 50% ADL.

<figure><img src="/images/adl.png" alt="ADL contrast vs content brightness"><figcaption>ADL contrast vs content level at F7, shifted lens. 50% ADL equals ANSI.</figcaption></figure>

Part 1 (design, setup & features) is on the [AVS Forum](https://www.avsforum.com). Part 3 (color & HDR) coming soon.
