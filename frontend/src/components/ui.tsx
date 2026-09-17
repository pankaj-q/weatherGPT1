"use client";

import { motion } from "framer-motion";

export function SectionHeading({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      {icon ? <span className="text-faint">{icon}</span> : null}
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-mist/80">
        {children}
      </h2>
      <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`glass rounded-3xl ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <motion.span
      className={`inline-block rounded-full border-2 border-white/20 border-t-white ${className}`}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
    />
  );
}