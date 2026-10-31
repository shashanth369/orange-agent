# Orange Agent Companion

This is the real-Chrome companion for the Orange Agent cockpit. A normal web app cannot control arbitrary Chrome tabs; this Manifest V3 extension is the permissioned bridge that can operate the active tab after the user installs it.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `extension/` folder.
4. Pin **Orange Agent Companion**.
5. Open the Orange Agent cockpit in a tab. The cockpit posts a plan to the companion; the companion runs it against the active Chrome tab.

The extension visibly moves an orange cursor, adds a mild orange viewport glow, focuses fields, types character-by-character, and clicks matching DOM targets. It uses `host_permissions: ["<all_urls>"]` because the user's active page can be any website. Chrome does not allow extensions to paint the browser's native tab frame, so the companion glows the actual webpage viewport and its active tab content instead.

The initial plan in `service-worker.js` is intentionally simple and safe to replace with a planner-generated sequence of `{type, selector, text, url, label}` actions.
