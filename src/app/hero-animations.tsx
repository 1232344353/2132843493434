"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export function HeroAnimations() {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: EASE }}
          className="font-outfit max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl xl:text-[4.2rem]"
        >
          Run your event scouting
          <span className="block bg-gradient-to-r from-teal-200 via-cyan-300 to-teal-400 bg-clip-text text-transparent">
            like a systems team.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease: EASE }}
          className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg"
        >
          We blend your live scouting observations with public event context so your
          drive team gets fast, structured, actionable match strategy.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24, ease: EASE }}
          className="mt-9 flex flex-col gap-3 sm:flex-row"
        >
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-teal-300 to-cyan-300 px-7 py-3 text-sm font-semibold text-[#042116] shadow-[0_0_32px_-12px_rgba(67,217,162,0.85)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-110 hover:shadow-[0_0_38px_-10px_rgba(67,217,162,0.92)]"
          >
            Start free
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-slate-200 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-300/40 hover:bg-teal-300/10"
          >
            See how it works
          </a>
        </motion.div>

      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.12, ease: EASE }}
        className="relative mx-auto w-full"
      >
        <div className="relative overflow-hidden rounded-xl">
          <Image
            src="/banner.png"
            alt="PitPilot dashboard"
            width={965}
            height={650}
            className="w-full"
            priority
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-40% to-[#03070a]" />
        </div>
      </motion.div>
    </div>
  );
}
