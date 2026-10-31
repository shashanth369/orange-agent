const DEFAULT_PLAN = [
  { type: "navigate", url: "https://www.google.com/", label: "Open search" },
  { type: "focus", selector: "textarea[name='q'], input[name='q']", label: "Research the goal" },
  { type: "type", selector: "textarea[name='q'], input[name='q']", text: "best noise-cancelling headphones under $300", label: "Research the goal" },
  { type: "click", selector: "input[name='btnK'], button[aria-label*='Search'], button[type='submit']", label: "Submit search" }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function activeTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function sendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    return { ok: false, error: "Orange Agent is not available on this page." };
  }
}

async function runPlan(plan = DEFAULT_PLAN) {
  let tab = await activeTab();
  if (!tab?.id) return { ok: false, error: "No active Chrome tab found." };

  for (const step of plan) {
    if (step.type === "navigate") {
      await chrome.tabs.update(tab.id, { url: step.url });
      await sleep(1500);
      tab = await activeTab();
      if (!tab?.id) return { ok: false, error: "The active tab closed during navigation." };
      await sendToTab(tab.id, { type: "ORANGE_AGENT_STEP", step });
      continue;
    }
    let result = await sendToTab(tab.id, { type: "ORANGE_AGENT_STEP", step });
    if (result?.ok === false) {
      await sleep(450);
      result = await sendToTab(tab.id, { type: "ORANGE_AGENT_STEP", step });
    }
    if (result?.ok === false) return { ok: false, error: result.error || `Could not complete ${step.label}` };
    await sleep(step.type === "type" ? 1000 : 850);
  }

  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "RUN_PLAN") {
    runPlan(message.plan).then(sendResponse);
    return true;
  }
  if (message?.type === "STOP") {
    chrome.storage.session.set({ stopped: true });
    sendResponse({ ok: true });
  }
});

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type === "RUN_PLAN") {
    runPlan(message.plan).then(sendResponse);
    return true;
  }
});
