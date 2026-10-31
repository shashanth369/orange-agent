# Orange Agent outcomes

## 1. Goal-driven agent cockpit
- [ ] The app provides a goal input where the user can describe the browser task they want completed.
- [ ] The app sends the goal to a planner and presents a clear, ordered multi-step plan derived from that prompt, with current, completed, and upcoming work visible at the same time.
- [ ] The plan is not hardcoded to one search demo; it can orchestrate related navigation, research, extraction, comparison, form, scrolling, verification, and other browser actions as appropriate to the prompt.

## 2. Observable browser action surface
- [ ] The app shows a browser-shaped viewport with tabs and a page surface that makes navigation and interaction understandable.
- [ ] The controlled viewport has a distinct orange agent cursor.
- [ ] The user can see the agent cursor move between interaction targets, click, focus a field, and type text.
- [ ] The active tab / browser viewport uses a mild orange glow while the agent is operating.

## 3. Live execution controls
- [ ] The app provides start/run, pause, resume, stop, and manual takeover controls during execution.
- [ ] The live progress interface updates as the agent advances through the ordered action sequence.
- [ ] The activity log explains in plain language what the agent is doing and why.

## 4. Outcome states
- [ ] The app communicates running, paused, stopped, complete, and blocked/error-like states with a concise summary and actionable next step.
- [ ] Responsive behavior keeps the cockpit usable on narrower screens without hiding the main browser surface.

## 5. Real Chrome companion
- [ ] A Manifest V3 companion can be loaded into the user's Chrome browser and receive a plan from the cockpit.
- [ ] The companion operates the active page with visible cursor movement, focus, character-by-character typing, and clicks.
- [ ] The companion adds a mild orange glow to the actual webpage viewport. Native Chrome tab chrome remains outside extension styling permissions.
