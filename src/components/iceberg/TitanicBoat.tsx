import { motion } from 'motion/react';

const FUNNELS = [72, 104, 136, 168];
const PORTHOLES = Array.from({ length: 11 }, (_, i) => 30 + i * 18);

/** Low-poly Titanic, drawn bow-left with the waterline at y=76. */
export function TitanicBoat() {
  return (
    <svg width="240" height="100" viewBox="0 0 240 100" fill="none" aria-hidden="true">
      <ellipse cx="120" cy="82" rx="102" ry="5" fill="oklch(0.2 0.04 240 / 0.25)" />

      <motion.g
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <polygon points="2,58 238,58 230,76 14,76" fill="#1a2733" />
        <polygon points="2,58 238,58 236,63 4,63" fill="#2b3f52" />
        <polygon points="2,58 14,76 14,63" fill="#223444" />
        <polygon points="238,58 230,76 230,63" fill="#223444" />
        <polygon points="4,56 236,56 238,58 2,58" fill="#d9d3c6" />

        <polygon points="44,44 196,44 196,58 44,58" fill="#e6e1d5" />
        <polygon points="44,44 196,44 196,47 44,47" fill="#f2eee4" />
        <polygon points="62,34 178,34 178,44 62,44" fill="#ded8ca" />
        <polygon points="84,26 156,26 156,34 84,34" fill="#e6e1d5" />

        {FUNNELS.map((x) => (
          <g key={x}>
            <polygon points={`${x + 4},8 ${x + 20},8 ${x + 16},34 ${x},34`} fill="#c07a3e" />
            <polygon points={`${x + 4},8 ${x + 20},8 ${x + 19},13 ${x + 3},13`} fill="#1c1c1c" />
            <polygon points={`${x},34 ${x + 16},34 ${x + 16},30 ${x},30`} fill="#8f5527" />
          </g>
        ))}

        <path d="M30 58V6M210 58V10" stroke="#2b3f52" strokeWidth="1.4" />
        <path d="M18 18h24M198 22h24" stroke="#2b3f52" strokeWidth="1" />

        {PORTHOLES.map((x) => (
          <circle key={x} cx={x} cy={68} r="1.3" fill="#f0d9a8" opacity="0.85" />
        ))}

        <polygon points="2,76 16,76 11,71" fill="oklch(1 0 0 / 0.3)" />
        <path d="M2 76h236" stroke="oklch(1 0 0 / 0.35)" strokeWidth="1" />
      </motion.g>
    </svg>
  );
}
