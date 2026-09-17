"use client";

import { motion, useReducedMotion } from "framer-motion";

/* Blur-free "aurora" blobs: soft edges come from radial gradients instead of a
   huge `filter: blur()` kernel, so moving them is a cheap compositor-only
   transform (no per-frame re-rasterisation). This keeps scrolling smooth. */
const BLOBS = [
  {
    className:
      "absolute -top-[28%] left-1/4 h-[52vh] w-[56vw] bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.22),transparent_70%)]",
    anim: { x: [0, 50, 0], y: [0, 35, 0] },
    duration: 28,
  },
  {
    className:
      "absolute top-1/3 -right-[22%] h-[50vh] w-[50vw] bg-[radial-gradient(circle_at_center,rgba(167,139,250,0.22),transparent_70%)]",
    anim: { x: [0, -45, 0], y: [0, -35, 0] },
    duration: 34,
  },
  {
    className:
      "absolute -bottom-[18%] left-[10%] h-[44vh] w-[46vw] bg-[radial-gradient(circle_at_center,rgba(129,140,248,0.18),transparent_70%)]",
    anim: { x: [0, 30, 0], y: [0, -25, 0] },
    duration: 40,
  },
];

export default function AuroraBackground() {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className={`${b.className} ${reduce ? "" : "transform-gpu"}`}
          style={reduce ? undefined : { willChange: "transform" }}
          initial={false}
          animate={reduce ? undefined : b.anim}
          transition={{ duration: b.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_50%_-10%,transparent_40%,#05070F_88%)]" />
    </div>
  );
}
