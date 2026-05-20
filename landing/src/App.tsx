import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  MapPin,
  Vibrate,
  BellRing,
  ScanFace,
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  Activity,
  Phone,
  Wifi,
  BatteryFull,
  Signal,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
 * Motion presets
 * ────────────────────────────────────────────────────────────────────────── */
const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

/* ─────────────────────────────────────────────────────────────────────────────
 * Nav  ·  glassmorphism sticky header
 * ────────────────────────────────────────────────────────────────────────── */
function Nav() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: 'Features', href: '#features' },
    { label: 'How it Works', href: '#how' },
    { label: 'Technology', href: '#tech' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
        <a href="#" className="flex items-center gap-2 text-sm font-medium tracking-[0.18em]">
          <ShieldCheck className="h-5 w-5 text-zinc-50" strokeWidth={1.5} />
          <span>PROXIMATE</span>
        </a>

        <nav className="hidden items-center gap-10 text-sm text-zinc-400 md:flex">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="transition hover:text-zinc-50">
              {l.label}
            </a>
          ))}
        </nav>

        <a
          href="#waitlist"
          className="hidden rounded-full border border-zinc-800 px-4 py-2 text-xs tracking-wide text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-50 md:inline-block"
        >
          Join Waitlist
        </a>

        <button
          aria-label="Open menu"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-zinc-800 p-2 text-zinc-300 md:hidden"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-zinc-800/60 md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4 text-sm text-zinc-300">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2 hover:bg-zinc-900/60"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#waitlist"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full bg-amber-400 px-4 py-2 text-center text-xs font-medium text-zinc-950"
              >
                Join Waitlist
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Hero
 * ────────────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-40 pb-32 sm:pt-48 sm:pb-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 75%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 sm:px-10">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-zinc-400"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          Personal safety, reconsidered
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="text-[clamp(3.5rem,11vw,9.5rem)] font-semibold leading-[0.92] tracking-[-0.045em]"
        >
          Safety.
          <br />
          <span className="text-zinc-500">Redefined.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-10 max-w-xl text-base leading-[1.85] text-zinc-400 sm:text-lg"
        >
          Advanced personal security technology. Proximity alerts, haptic triggers,
          and automated emergency response — engineered for the moments that matter.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
        >
          <a
            href="#waitlist"
            className="group inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-300"
          >
            Join the Waitlist
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-6 py-3.5 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-50"
          >
            How it works
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-24 flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-zinc-800/60 pt-10 text-[11px] uppercase tracking-[0.22em] text-zinc-500"
        >
          <span>End-to-end encrypted</span>
          <span>Sub-second triggers</span>
          <span>Privacy by design</span>
          <span>Verified responders</span>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Features
 * ────────────────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: MapPin,
    title: 'Proximity-Based Alerts',
    desc: 'Intelligent geofencing and real-time threat awareness — your circle of trust expands and contracts with you.',
  },
  {
    icon: Vibrate,
    title: 'Haptic Wearable Triggers',
    desc: 'Discreet, instant activation through wrist-worn pulses. No fumbling. No noise. Just response.',
  },
  {
    icon: BellRing,
    title: 'Automated Notifications',
    desc: 'Instantaneous communication with your emergency contacts and the nearest verified responder.',
  },
  {
    icon: ScanFace,
    title: 'Biometric & Gesture Activation',
    desc: 'Advanced computer vision detects duress in high-stress moments — even when speech is impossible.',
  },
];

function Features() {
  return (
    <section id="features" className="relative border-t border-zinc-800/60 px-6 py-32 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="mb-20 max-w-2xl">
          <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
            Core capability
          </p>
          <h2 className="text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-5xl">
            Engineered for the seconds<br className="hidden sm:block" />
            {' '}that decide everything.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-800/60 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group relative bg-zinc-950 p-10 transition-colors hover:bg-zinc-900/60 sm:p-12"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 transition group-hover:border-zinc-700">
                <f.icon className="h-5 w-5 text-zinc-100" strokeWidth={1.4} />
              </div>
              <h3 className="mt-10 text-xl font-medium tracking-tight text-zinc-50">
                {f.title}
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-[1.8] text-zinc-400">{f.desc}</p>
              <ArrowUpRight className="absolute right-8 top-8 h-4 w-4 text-zinc-600 transition group-hover:text-zinc-300" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * App preview
 * ────────────────────────────────────────────────────────────────────────── */
function AppPreview() {
  return (
    <section id="how" className="border-t border-zinc-800/60 px-6 py-32 sm:px-10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-20 lg:grid-cols-2 lg:items-center">
        <motion.div {...fadeUp}>
          <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
            The interface
          </p>
          <h2 className="text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-5xl">
            A single tap.
            <br />
            A trusted network.
          </h2>
          <p className="mt-8 max-w-md text-base leading-[1.85] text-zinc-400">
            Proximate is built around restraint — quiet by default, decisive when
            needed. The interface stays out of the way until the moment it doesn't.
          </p>

          <ul className="mt-12 space-y-5 text-sm text-zinc-300">
            {[
              'Live status ring shows protection state at a glance.',
              'Encrypted, end-to-end location sharing on demand.',
              'Trusted contacts receive verified, accurate context.',
              'Single-tap cancellation with biometric verification.',
            ].map((line) => (
              <li key={line} className="flex items-start gap-4">
                <span className="mt-[10px] h-px w-6 shrink-0 bg-zinc-700" />
                <span className="leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-sm"
        >
          <MockPhone />
        </motion.div>
      </div>
    </section>
  );
}

function MockPhone() {
  const [active, setActive] = useState(false);
  const R = 46;
  const circumference = 2 * Math.PI * R;

  return (
    <div className="relative rounded-[2.75rem] border border-zinc-800 bg-zinc-900/40 p-3 shadow-[0_0_120px_-40px_rgba(255,255,255,0.18)]">
      <div className="relative overflow-hidden rounded-[2.25rem] border border-zinc-800 bg-zinc-950">
        {/* Status bar */}
        <div className="flex items-center justify-between px-7 pt-6 text-[10px] text-zinc-400">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <Signal className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <BatteryFull className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Header */}
        <div className="px-7 pt-8">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Proximate</p>
          <h4 className="mt-1 text-xl font-medium tracking-tight">
            {active ? 'Alert active' : 'Standby'}
          </h4>
        </div>

        {/* Status ring */}
        <div className="relative mx-auto mt-10 flex h-48 w-48 items-center justify-center">
          <svg viewBox="0 0 100 100" className="absolute h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={R} stroke="rgba(255,255,255,0.07)" strokeWidth="1" fill="none" />
            <motion.circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              strokeWidth="1.5"
              stroke={active ? '#fbbf24' : '#fafafa'}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={false}
              animate={{ strokeDashoffset: active ? 0 : circumference * 0.25 }}
              transition={{ duration: 1, ease: 'easeInOut' }}
            />
          </svg>

          <motion.div
            animate={{ scale: active ? [1, 1.12, 1] : 1, opacity: active ? [0.6, 0.2, 0.6] : 1 }}
            transition={{ duration: 1.8, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
            className={`absolute h-32 w-32 rounded-full ${
              active ? 'bg-amber-400/15' : 'bg-zinc-50/[0.02]'
            }`}
          />

          <div className="relative flex flex-col items-center">
            <Activity
              className={`h-6 w-6 ${active ? 'text-amber-400' : 'text-zinc-100'}`}
              strokeWidth={1.5}
            />
            <span className="mt-2 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              {active ? 'Broadcasting' : 'Protected'}
            </span>
          </div>
        </div>

        {/* Trigger button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setActive((v) => !v)}
            className={`rounded-full px-5 py-2 text-[11px] tracking-wide transition ${
              active
                ? 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
                : 'border border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-zinc-50'
            }`}
          >
            {active ? 'Cancel alert' : 'Trigger alert'}
          </button>
        </div>

        {/* Map placeholder */}
        <div className="mx-5 mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <div
            className="relative h-32 w-full"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              <path
                d="M0,70 C30,60 60,80 90,55 S150,40 200,55"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M0,20 C40,30 80,10 120,30 S180,40 200,25"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M40,0 L40,100 M120,0 L120,100"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            </svg>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span
                  className={`absolute h-6 w-6 rounded-full ${
                    active ? 'animate-ping bg-amber-400/40' : 'bg-zinc-100/10'
                  }`}
                />
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    active ? 'bg-amber-400' : 'bg-zinc-50'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Trusted contacts */}
        <div className="px-7 py-7">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              Trusted circle
            </p>
            <span className="text-[10px] text-zinc-600">3 active</span>
          </div>
          <ul className="mt-4 space-y-3">
            {[
              { name: 'Aanya R.', rel: 'Mother' },
              { name: 'Vikram S.', rel: 'Father' },
              { name: 'Priya N.', rel: 'Sister' },
            ].map((c) => (
              <li key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="grid h-7 w-7 place-items-center rounded-full border border-zinc-800 bg-zinc-900 text-[10px] text-zinc-300">
                    {c.name[0]}
                  </div>
                  <div>
                    <p className="text-zinc-100">{c.name}</p>
                    <p className="text-[10px] text-zinc-500">{c.rel}</p>
                  </div>
                </div>
                <Phone className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
              </li>
            ))}
          </ul>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pb-3">
          <span className="h-[3px] w-24 rounded-full bg-zinc-700" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Footer / CTA
 * ────────────────────────────────────────────────────────────────────────── */
function Footer() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <section id="contact" className="border-t border-zinc-800/60">
      <div id="waitlist" className="mx-auto max-w-6xl px-6 py-32 sm:px-10">
        <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
            Early access
          </p>
          <h2 className="text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-7xl">
            Be among
            <br />
            the first protected.
          </h2>
          <p className="mx-auto mt-8 max-w-lg text-base leading-[1.85] text-zinc-400">
            Limited spots for early access. Receive priority onboarding, founder
            updates, and lifetime access to the trusted network.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="mx-auto mt-12 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-full border border-zinc-800 bg-zinc-900/40 px-5 py-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sent}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-3.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:bg-zinc-800 disabled:text-zinc-400"
            >
              {sent ? 'On the list' : 'Join the Waitlist'}
              {!sent && <ArrowUpRight className="h-4 w-4" />}
            </button>
          </form>
        </motion.div>
      </div>

      <div id="tech" className="border-t border-zinc-800/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
            <span className="tracking-[0.18em]">PROXIMATE — © {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <a href="#" className="transition hover:text-zinc-200">Privacy</a>
            <a href="#" className="transition hover:text-zinc-200">Terms</a>
            <a href="#" className="transition hover:text-zinc-200">Security</a>
            <a href="#" className="transition hover:text-zinc-200">Press</a>
            <a href="#" className="transition hover:text-zinc-200">Contact</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * App root
 * ────────────────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-50 antialiased selection:bg-amber-400/30 selection:text-amber-100">
      <Nav />
      <main>
        <Hero />
        <Features />
        <AppPreview />
        <Footer />
      </main>
    </div>
  );
}
