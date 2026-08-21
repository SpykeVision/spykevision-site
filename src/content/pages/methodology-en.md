---
title: Measurement Methodology | SpykeVision
description: The full bench protocol behind every SpykeVision review — instruments, patterns, conditions, and how each brightness and contrast number is produced.
heroTitle: How every number is measured.
centered: true
active: about
---
Every figure in a SpykeVision review comes from the same bench protocol, so results are comparable across projectors and reproducible by anyone with similar equipment. This page documents that protocol in full. If a review deviates from it, the deviation is stated next to the measurement.

## The bench

- **Meter:** calibrated lux meter (NIST-certified), mounted on a tripod.
- **Stray light control:** the sensor sits inside a velvet tube — velvet both inside and outside — to minimize stray reflections. The sensor is always fully illuminated, and the angle is chosen so no shadows fall inside the tube.
- **Picture modes:** unless stated otherwise, measurements use the manufacturer-calibrated modes — typically **ISF Night / D65** or **Movie**.
- **Thermal stabilization:** the projector warms up before any reading is taken.

## The 90-second rule

Laser projectors throttle. On a sustained full-white field, light output can start decaying after ~2 minutes and keep dropping for 10–15 minutes before stabilizing — I've measured drops of over 12%. That's invisible with real content, but fatal for measurement consistency. So every reading is taken **within 90 seconds of pattern display**. Each review also documents the throttling behaviour itself: how soon decay starts, how deep it goes, and when it stabilizes.

## Brightness

Brightness is measured across the **full zoom and iris range**, not just the spec-sheet sweet spot. That's how you find out what the projector actually delivers at *your* throw distance — and how much light the "best contrast" configuration really costs.

## Native contrast (On/Off)

Full-field on/off contrast, measured at **every zoom and iris combination**. Black level readings are taken with the same tube-shielded sensor; the protocol keeps black readings well above the meter's noise floor so the ratios are trustworthy.

## ANSI contrast

Standard checkerboard pattern, measured in two lens configurations: **centered** and **shifted to the vertical extreme**. Lens shift measurably changes ANSI contrast on many projectors, and most published numbers silently use whichever position flatters the product — here both are reported.

## ADL contrast curve

The headline metric of these reviews: the **full contrast curve across Average Display Level (ADL)** — from on/off through 1%, 5%, and up to the 50% ANSI point — measured at several zoom positions in the projector's maximum-contrast configuration. On/off and ANSI are two single points; the ADL curve is what your eyes actually get across real scenes. You can explore and compare these curves yourself in the <a href="/adl-calculator/">ADL Calculator</a>.

## Dynamic systems (iris, laser dimming)

Dynamic contrast features are measured, not just eyeballed. Laser dimming and highlight brightness are measured **separately**, across a defined set of film scenes spanning a wide range of ADL values. The result is assessed as a function of scene ADL: how active the system is, how much it dims, and what the real contrast multiplier looks like — with particular attention below **5% ADL**, the perceptually most sensitive zone for black level. Activation behaviour, speed, and the content that defeats the system are documented alongside the numbers.

## Optics

- **Sharpness:** resolution test patterns across the frame and the zoom range.
- **Distortion:** checked against a laser level.
- **White-field uniformity:** full-field maps at multiple zoom positions, including color tint shifts across the frame.
- **Lens shift:** optical behaviour across the shift range.
- **Laser speckle:** evaluated on the screen surfaces used for testing.

## Noise, power, gaming

- **Fan and system noise** is assessed per picture mode, including the acoustic side effects of features like anti-RBE.
- **Power consumption** is measured per mode.
- **Input lag and motion** are tested with real gaming content across the projector's game-mode options.

## Corrections

The pattern, instrument, and conditions are documented alongside each chart, so any measurement can be reproduced. Spotted something off? Write via the [contact form](/contact/) — corrections are published openly.
