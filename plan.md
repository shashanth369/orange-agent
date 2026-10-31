# Orange Agent — implementation plan

## Product scope
Orange Agent is a browser-agent control cockpit. It turns a user goal into a visible sequence of multi-step browser actions and makes the agent's behavior legible: a distinct orange cursor, smooth movement, visible clicks and typing, a mild orange glow around the active tab or browser viewport, a live progress view, an activity log, and controls for pause, resume, stop, and manual takeover.

The first delivered slice is an interactive front-end cockpit plus a Chrome Extension companion. The cockpit sends the user's prompt to a managed planner, renders the returned ordered plan, and posts that plan to the companion when installed. The companion is the permissioned bridge for the user's actual Chrome tabs: it can inject the orange cursor/viewport glow and perform DOM-level focus, typing, clicking, navigation, scrolling, observation, extraction, verification, and lightweight retry recovery.

## Implementation approach
- Replace the starter Home page with a single responsive cockpit screen.
- Model agent execution as a small deterministic state machine in React (`idle`, `running`, `paused`, `complete`, `stopped`) with a timed sequence of browser actions.
- Use a browser-shaped stage with tabs, address bar, page content, and an absolutely positioned orange agent cursor. Cursor position, click pulse, focus treatment, and typing state are driven by the current action.
- Keep the left goal/controls rail, center browser stage, and right mission/activity rail visually distinct but connected through the same run state.
- Use local component state only for this prototype; no database writes are required. The initialized server is retained for future browser-bridge and LLM orchestration endpoints.
- Add a route manifest for `/` and set durable project metadata before checkpointing.

## Project structure
- `client/src/pages/Home.tsx`: cockpit layout, execution state machine, stage, controls, progress, and activity log.
- `server/agentPlanner.ts`, `server/routers.ts`: structured prompt-to-browser-plan generation using the managed LLM service with validated action types.
- `client/src/index.css`: dark graphite / soft-cream visual system, browser-stage geometry, custom cursor motion, tab glow, responsive behavior, and reduced-motion handling.
- `extension/manifest.json`: Manifest V3 permissions, content-script registration, and cockpit origin allowlist.
- `extension/service-worker.js`: active-tab routing and sequential plan execution.
- `extension/content-script.js`, `extension/content-style.css`: real-page cursor, viewport glow, focus, typing, and click behavior.
- `extension/README.md`: local Chrome installation and capability boundary.
- `client/src/App.tsx`: existing application shell and route registration.
- `public/manus-routes.json`: published route declaration.
- `plan.md`, `TODO.md`: product implementation and acceptance record.

## Design direction

### Three candidate styles
- **Signal Console** — 0.07 probability: a dark operator console with amber telemetry and instrument-like density.
- **Studio Terminal** — 0.05 probability: editorial cream surfaces, black browser chrome, and restrained orange interaction traces.
- **Night Shift** — 0.08 probability: near-black workspace with warm white copy and a single high-energy orange action color.

### Chosen style: Signal Console

**Design Movement:** Modern mission-control UI meets premium developer tooling: dense enough to feel operational, but composed with editorial restraint rather than generic dashboard cards.

**Core Principles:** (1) the agent is always observable, (2) orange is reserved for attention and motion, (3) every control has a clear state, and (4) the browser surface is the hero, not a decorative illustration.

**Color Philosophy:** A graphite-black environment makes the agent's orange cursor and glow feel like an instrument signal. Warm parchment is used only for the simulated webpage, so the controlled surface reads as a separate plane. Muted lavender-grey carries secondary telemetry without competing with orange.

**Layout Paradigm:** Three-zone control room: narrow command rail on the left, wide browser stage in the center, and a compact mission rail on the right. The center stage is intentionally offset upward and framed like a live viewport, avoiding a centered marketing layout.

**Signature Elements:** a four-dot orange wordmark, a thin amber signal line under the active tab, and a tiny cursor HUD showing the current action.

**Interaction Philosophy:** Start is deliberate and explicit; once running, the interface narrates the agent in plain language. Pause freezes motion without losing context. Stop makes the browser viewport calm and leaves an actionable state summary.

**Animation:** Cursor travel is 650ms cubic-bezier motion; clicks use a two-ring orange pulse; active tabs breathe with a low-amplitude glow; typing reveals one character at a time. Respect `prefers-reduced-motion` by snapping motion and disabling repeated pulses.

**Typography System:** Use a neutral grotesk stack for interface text with monospace for action labels, URLs, timestamps, and telemetry. Headings are compact uppercase with generous tracking; explanatory copy is sentence case and short.

**Brand Essence:** An observable browser agent for people who want automation without losing the plot — transparent, precise, reassuring.

**Brand Voice:** Calm, technical, plain-spoken. Example lines: “The agent is at the search field.” and “Paused before opening the first result.”

**Wordmark & Logo:** Four small orange squares in a stepped signal pattern, followed by the two-line `ORANGE / AGENT` lockup.

**Signature Brand Color:** `#ff6b2c`, a vivid signal orange that reads clearly on graphite and parchment.

## Frontend / backend boundary
The current UI uses an in-browser runner so the interaction can be seen immediately in Preview. Future browser control should connect through an extension or native bridge (for tab access, DOM targeting, and real pointer events), with server-side planning/LLM endpoints added behind the existing Express/tRPC scaffold. No credentials or external APIs are needed for this first slice.
