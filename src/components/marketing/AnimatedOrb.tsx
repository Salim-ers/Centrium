'use client';

import { motion } from 'framer-motion';

export function AnimatedOrb() {
  return (
    <div className="relative w-full aspect-square max-w-[560px] mx-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.25),transparent_60%)] blur-2xl" />

      <motion.svg
        viewBox="0 0 400 400"
        className="relative z-10 w-full h-full"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        <defs>
          <linearGradient id="orbStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#e11d74" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="orbStrokeBright" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#e11d74" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="orbCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(139,92,246,0.35)" />
            <stop offset="100%" stopColor="rgba(10,11,20,0)" />
          </radialGradient>
        </defs>

        <circle cx="200" cy="200" r="160" fill="url(#orbCore)" />

        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '200px 200px' }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={`mer-${i}`}
              x1="200"
              y1="40"
              x2="200"
              y2="360"
              stroke="url(#orbStroke)"
              strokeWidth="0.6"
              transform={`rotate(${(i * 180) / 12} 200 200)`}
            />
          ))}
        </motion.g>

        <g>
          {[40, 70, 100, 130, 160].map((r, i) => (
            <motion.ellipse
              key={`par-${i}`}
              cx="200"
              cy="200"
              rx="160"
              ry={r}
              fill="none"
              stroke="url(#orbStroke)"
              strokeWidth="0.6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.8 }}
            />
          ))}
        </g>

        <motion.ellipse
          cx="200"
          cy="200"
          rx="160"
          ry="80"
          fill="none"
          stroke="url(#orbStrokeBright)"
          strokeWidth="1.4"
          transform="rotate(-25 200 200)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: 'easeInOut' }}
        />
        <motion.ellipse
          cx="200"
          cy="200"
          rx="160"
          ry="120"
          fill="none"
          stroke="url(#orbStrokeBright)"
          strokeWidth="1.2"
          transform="rotate(35 200 200)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.2, ease: 'easeInOut', delay: 0.3 }}
        />

        <circle cx="200" cy="200" r="160" fill="none" stroke="url(#orbStrokeBright)" strokeWidth="1" />

        <motion.circle
          r="4"
          fill="#8b5cf6"
          animate={{
            cx: [200, 330, 200, 70, 200],
            cy: [60, 200, 340, 200, 60],
            opacity: [0.5, 1, 0.5, 1, 0.5],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        <motion.circle
          r="3"
          fill="#e11d74"
          animate={{
            cx: [70, 200, 330, 200, 70],
            cy: [200, 60, 200, 340, 200],
            opacity: [0.8, 0.4, 0.8, 0.4, 0.8],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />
      </motion.svg>

      <div className="absolute top-[12%] left-[-4%] z-20">
        <Tag label="Consultants" dot="violet" />
      </div>
      <div className="absolute top-[28%] right-[-6%] z-20">
        <Tag label="CRM Pipeline" dot="cyan" />
      </div>
      <div className="absolute bottom-[22%] right-[2%] z-20">
        <Tag label="CV IA" dot="magenta" />
      </div>
      <div className="absolute bottom-[12%] left-[4%] z-20">
        <Tag label="CRA & Facturation" dot="violet" />
      </div>
    </div>
  );
}

function Tag({ label, dot }: { label: string; dot: 'violet' | 'cyan' | 'magenta' }) {
  const dotColor = dot === 'violet' ? 'bg-violet-400' : dot === 'cyan' ? 'bg-cyan-400' : 'bg-magenta';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.6 }}
      className="flex items-center gap-2 rounded-full border border-white/10 bg-midnight-100/80 backdrop-blur px-3 py-1.5 text-xs font-medium text-white/90 shadow-lg"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
    </motion.div>
  );
}
