/**
 * All static copy and structured data for the HZEL landing page.
 *
 * Keeping content separate from component logic makes it easy to iterate
 * on messaging without touching layout or animation code.
 */

// ─── Navigation ──────────────────────────────────────────────────────────────

export const NAV_LINKS = [
  { label: 'Platform', href: '/' },
  { label: 'Principles', href: '/principles' },
  { label: 'Capabilities', href: '/capabilities' },
  { label: 'Trust', href: '/trust' },
  { label: 'System', href: '/system' },
] as const;

// ─── Hero ─────────────────────────────────────────────────────────────────────

export const HERO = {
  eyebrow: 'HZEL',
  headline: 'Operate hosted systems with clarity',
  subheadline:
    'HZEL is built around what people actually need when they run things: clear actions, visible state, shared access that makes sense, and a platform that stays useful as your needs grow.',
  primaryCta: 'Explore the platform',
  secondaryCta: 'View system design',
  pills: ['Clear workflows', 'Shared control', 'Realtime visibility'],
} as const;

// ─── Philosophy ───────────────────────────────────────────────────────────────

export const PHILOSOPHY = {
  label: 'Built Around Use',
  headline: 'Useful systems are easier to trust',
  subheadline:
    'HZEL is designed around the way people actually work with hosted systems — not around backend internals, inflated positioning, or dashboards that look better than they operate.',
  principles: [
    {
      title: 'Useful by default',
      body: 'The interface should reflect real tasks, not internal complexity.',
    },
    {
      title: 'Clear under load',
      body: 'Actions, state, and outcomes should stay understandable when things are busy.',
    },
    {
      title: 'Trust through design',
      body: 'Control, access, and accountability should be part of the system, not extra paperwork around it.',
    },
  ],
} as const;

// ─── Capabilities ─────────────────────────────────────────────────────────────

export const CAPABILITIES = {
  label: 'Capability Constellation',
  headline: 'A platform shaped around action, feedback, and control',
  subheadline:
    'HZEL brings together the parts that matter most in day-to-day operation: making changes safely, seeing what happened, and keeping shared environments understandable.',
  items: [
    {
      title: 'Lifecycle Control',
      body: 'Start, stop, restart, inspect, and manage system state without turning routine operations into guesswork.',
      accent: 'cyan' as const,
    },
    {
      title: 'Command Execution',
      body: 'Run commands through a controlled workflow with full visibility into what was sent, when it ran, and what came back.',
      accent: 'blue' as const,
    },
    {
      title: 'Realtime Feedback',
      body: 'Stream output and live status where it matters, so people can act with context instead of refreshing blind.',
      accent: 'violet' as const,
    },
    {
      title: 'Shared Access',
      body: 'Support teams working in the same environment without collapsing ownership, visibility, or responsibility.',
      accent: 'cyan' as const,
    },
    {
      title: 'Audit Visibility',
      body: 'Keep a trail of actions and outcomes so operations stay reviewable after the moment has passed.',
      accent: 'emerald' as const,
    },
    {
      title: 'Platform Growth',
      body: 'Built to support broader hosted workflows over time, without forcing today\'s use cases into tomorrow\'s shape.',
      accent: 'blue' as const,
    },
  ],
} as const;



// ─── Trust ────────────────────────────────────────────────────────────────────

export const TRUST = {
  label: 'Trust Without Friction',
  headline: 'Easy to use does not have to mean easy to misuse',
  subheadline:
    'HZEL is designed so people can move quickly without losing control of access, visibility, or accountability. The platform stays approachable at the surface while maintaining clear boundaries underneath.',
  quote: 'The goal is not to add friction. The goal is to make control usable.',
  points: [
    {
      title: 'Guided interaction',
      body: 'People work through the platform instead of navigating raw internal systems directly.',
    },
    {
      title: 'Clear boundaries',
      body: 'Access and action flow stay mediated, which makes shared environments easier to operate responsibly.',
    },
    {
      title: 'Visible activity',
      body: 'State, execution, and outcomes are easier to follow in real time and easier to review later.',
    },
    {
      title: 'Accountability built in',
      body: 'When multiple people use the same environment, actions should remain attributable and reviewable.',
    },
  ],
} as const;

// ─── System Flow ──────────────────────────────────────────────────────────────

export const SYSTEM = {
  label: 'System Flow',
  headline: 'Simple where people interact. Structured where control matters.',
  subheadline:
    'HZEL keeps the front end of the experience clear while organizing execution, policy, visibility, and backend integration behind the scenes. That separation is what lets the platform stay usable as it grows.',
  caption: 'The user experience stays clean because the complexity is organized, not ignored.',
  layers: [
    {
      title: 'Platform Surface',
      body: 'The interface where users act, inspect state, and work with live feedback.',
      accent: 'cyan' as const,
    },
    {
      title: 'Control Layer',
      body: 'The application logic that turns requests into governed workflows.',
      accent: 'blue' as const,
    },
    {
      title: 'Identity & Policy',
      body: 'Where access, scope, and responsibility are enforced consistently.',
      accent: 'violet' as const,
    },
    {
      title: 'Execution & Streaming',
      body: 'Where commands, sessions, and realtime updates are coordinated.',
      accent: 'blue' as const,
    },
    {
      title: 'Infrastructure Integration',
      body: 'The backend systems and adapters that actually perform the work.',
      accent: 'emerald' as const,
    },
  ],
} as const;

// ─── Closing ──────────────────────────────────────────────────────────────────

export const CLOSING = {
  label: 'Next Step',
  headline: 'Bring clearer control to hosted operations',
  subheadline:
    'HZEL is built for teams that want better workflows, better visibility, and a platform that grows with real use instead of marketing claims.',
  cta: 'Review architecture',
  caption: 'Built for clarity, control, and real operational use.',
} as const;
