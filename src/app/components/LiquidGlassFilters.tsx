"use client";

import React from "react";

/**
 * Generates a displacement map image (data URL) for a rounded-rectangle panel.
 * - Red/Green channels encode X/Y displacement in [0..255] with 128 = neutral.
 * - Displacement vectors point along the outward normal of the rounded rect border,
 *   with magnitude decaying inward over the bezel width (convex profile approximation).
 */
function generateRoundedRectDisplacementMap(options?: {
  width?: number;
  height?: number;
  radius?: number;
  bezel?: number; // inward decay width (px)
  maxShiftPx?: number; // used as <feDisplacementMap scale>
}) {
  const width = options?.width ?? 1024;
  const height = options?.height ?? 768;
  const radius = options?.radius ?? 16;
  const bezel = Math.max(1, options?.bezel ?? 12);
  const maxShiftPx = Math.max(1, options?.maxShiftPx ?? 18);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { url: "", width, height, maxShiftPx };

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // SDF for rounded rectangle centered in canvas with padding equal to bezel
  const halfW = width / 2;
  const halfH = height / 2;
  const pad = Math.ceil(bezel) + 1;
  const rectHalf = { x: halfW - pad, y: halfH - pad };
  const r = Math.max(0, radius);

  function sdRoundedBox(px: number, py: number) {
    // map pixel to centered coords
    const x = px - halfW;
    const y = py - halfH;
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    const qx = ax - rectHalf.x + r;
    const qy = ay - rectHalf.y + r;
    const qxPos = Math.max(qx, 0);
    const qyPos = Math.max(qy, 0);
    const outside = Math.hypot(qxPos, qyPos);
    const inside = Math.min(Math.max(qx, qy), 0);
    return outside + inside - r; // signed distance (negative = inside)
  }

  // Finite difference to approximate gradient (normal)
  const eps = 1.0;
  function gradient(px: number, py: number) {
    const dx = sdRoundedBox(px + eps, py) - sdRoundedBox(px - eps, py);
    const dy = sdRoundedBox(px, py + eps) - sdRoundedBox(px, py - eps);
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  // Iterate pixels; encode displacement in RG
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const d = sdRoundedBox(x, y);
      // Only refract inside the shape and within the bezel distance from the edge
      let mag = 0;
      if (d <= 0 && -d <= bezel) {
        // Convex profile: slightly ease-in the magnitude across the bezel
        const t = Math.max(0, Math.min(1, 1 - (-d / bezel))); // 1 at edge -> 0 inward
        // Smootherstep t^2*(3-2t)
        const smooth = t * t * (3 - 2 * t);
        mag = smooth; // normalized [0..1]
      }
      if (mag > 0) {
        const n = gradient(x, y); // outward normal (points from inside -> outside)
        // Map normalized vector components to [0..255] with 128 as neutral
        const rx = 128 + Math.max(-1, Math.min(1, n.x * mag)) * 127;
        const gy = 128 + Math.max(-1, Math.min(1, n.y * mag)) * 127;
        data[idx] = rx;
        data[idx + 1] = gy;
        data[idx + 2] = 128; // unused
        data[idx + 3] = 255;
      } else {
        // Neutral (no displacement)
        data[idx] = 128;
        data[idx + 1] = 128;
        data[idx + 2] = 128;
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const url = canvas.toDataURL("image/png");
  return { url, width, height, maxShiftPx };
}

export default function LiquidGlassFilters() {
  const [mapUrl, setMapUrl] = React.useState<string>("");
  const [dims, setDims] = React.useState<{w: number; h: number; scale: number}>({ w: 0, h: 0, scale: 18 });

  React.useEffect(() => {
    // Pick a reasonably large map so typical panels are covered.
    // If needed, we could recompute on resize; keep simple for now.
    const w = 1024;
    const h = 768;
    const { url, width, height, maxShiftPx } = generateRoundedRectDisplacementMap({ width: w, height: h, radius: 14, bezel: 14, maxShiftPx: 18 });
    setMapUrl(url);
    setDims({ w: width, h: height, scale: maxShiftPx });
  }, []);

  // Render the filter only when the map exists (client-only)
  if (!mapUrl) return null;

  const filterId = "liquidGlassRefraction";

  return (
    <svg width="0" height="0" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feImage
            href={mapUrl}
            x={0}
            y={0}
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            result="displacement_map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="displacement_map"
            scale={dims.scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
