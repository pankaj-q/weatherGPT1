"use client";

import { motion } from "framer-motion";

const BLOBS = [
  {
    className:
      "absolute -top-[30%] left-1/4 h-[58vh] w-[62vw] rounded-full bg-sky/20 blur-[150px]",
    anim: { x: [0, 50, 0], y: [0, 35, 0] },
    duration: 28,
  },
  {
    className:
      "absolute top-1/3 -right-[25%] h-[55vh] w-[55vw] rounded-full bg-violet/20 blur-[160px]",
    anim: { x: [0, -45, 0], y: [0, -35, 0] },
    duration: 34,
  },
  {
    className:
      "absolute -bottom-[20%] left-[10%] h-[48vh] w-[50vw] rounded-full bg-indigo/15 blur-[140px]",
    anim: { x: [0, 30, 0], y: [0, -25, 0] },
    duration: 40,
  },
];

export default function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className={b.className}
          animate={b.anim}
          transition={{ duration: b.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_50%_-10%,transparent_40%,#05070F_88%)]" />
    </div>
  );
}