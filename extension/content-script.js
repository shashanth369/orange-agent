(() => {
  const state = { cursor: null, edge: null, label: null };

  function ensureOverlay() {
    if (state.cursor) return;
    state.edge = document.createElement("div");
    state.edge.className = "orange-agent-edge";
    state.cursor = document.createElement("div");
    state.cursor.className = "orange-agent-cursor";
    state.cursor.innerHTML = '<svg class="orange-agent-pointer" viewBox="0 0 28 34" aria-hidden="true"><path d="M3 2.5 24.5 20 15.8 20.8 20.3 30.5 15.4 32.5 10.9 22.5 5.2 27Z" /></svg><span class="orange-agent-label"></span><span class="orange-agent-click"></span>';
    state.label = state.cursor.querySelector(".orange-agent-label");
    document.documentElement.append(state.edge, state.cursor);
  }

  function setLabel(text) {
    ensureOverlay();
    state.label.textContent = text || "Orange Agent";
  }

  function moveTo(target, label) {
    ensureOverlay();
    const rect = typeof target === "object" ? target : target.getBoundingClientRect();
    state.cursor.style.left = `${Math.max(8, rect.left + Math.min(rect.width * 0.5, 18))}px`;
    state.cursor.style.top = `${Math.max(8, rect.top + Math.min(rect.height * 0.5, 18))}px`;
    setLabel(label);
    return new Promise((resolve) => setTimeout(resolve, 680));
  }

  function find(selector) {
    return selector.split(",").map((part) => part.trim()).map((part) => document.querySelector(part)).find(Boolean);
  }

  async function focusElement(step) {
    const el = find(step.selector);
    if (!el) return { ok: false, error: `Could not find ${step.selector}` };
    await moveTo(el, step.label);
    el.focus({ preventScroll: false });
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    return { ok: true };
  }

  async function typeInto(step) {
    const el = find(step.selector);
    if (!el) return { ok: false, error: `Could not find ${step.selector}` };
    await moveTo(el, step.label);
    el.focus({ preventScroll: false });
    const value = step.text || "";
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    for (let i = 0; i <= value.length; i += 1) {
      if (setter) setter.call(el, value.slice(0, i));
      else el.value = value.slice(0, i);
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value[i - 1] || "" }));
      await new Promise((resolve) => setTimeout(resolve, 42));
    }
    return { ok: true };
  }

  async function clickElement(step) {
    const el = find(step.selector);
    if (!el) return { ok: false, error: `Could not find ${step.selector}` };
    await moveTo(el, step.label);
    state.cursor.classList.add("is-clicking");
    window.setTimeout(() => state.cursor.classList.remove("is-clicking"), 420);
    el.animate([{ outline: "2px solid rgba(255,107,44,.9)" }, { outline: "2px solid transparent" }], { duration: 520 });
    el.click();
    return { ok: true };
  }

  async function scrollPage(step) {
    ensureOverlay();
    window.scrollBy({ top: step.direction === "up" ? -(step.amount || 640) : (step.amount || 640), behavior: "smooth" });
    await new Promise((resolve) => setTimeout(resolve, 650));
    await moveTo({ left: window.innerWidth * 0.78, top: window.innerHeight * 0.72, width: 1, height: 1 }, step.label);
    return { ok: true };
  }

  async function inspectPage(step) {
    const el = step.selector ? find(step.selector) : document.body;
    if (!el) return { ok: false, error: `Could not find ${step.selector}` };
    await moveTo(el, step.label);
    const text = (el.innerText || el.textContent || "").trim().slice(0, 2000);
    return { ok: true, text };
  }

  async function handleStep(step) {
    ensureOverlay();
    state.edge.classList.add("is-active");
    if (step.type === "focus") return focusElement(step);
    if (step.type === "type") return typeInto(step);
    if (step.type === "click") return clickElement(step);
    if (step.type === "scroll") return scrollPage(step);
    if (step.type === "extract" || step.type === "observe" || step.type === "verify") return inspectPage(step);
    if (step.type === "wait") {
      setLabel(step.label || "Waiting");
      await new Promise((resolve) => setTimeout(resolve, step.ms || 900));
      return { ok: true };
    }
    setLabel(step.label || "Navigating");
    await moveTo({ left: window.innerWidth * 0.12, top: window.innerHeight * 0.12, width: 1, height: 1 }, step.label);
    return { ok: true };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "ORANGE_AGENT_STEP") return;
    handleStep(message.step).then(sendResponse);
    return true;
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "orange-agent") return;
    if (event.data.type === "RUN_PLAN") chrome.runtime.sendMessage({ type: "RUN_PLAN", plan: event.data.plan });
    if (event.data.type === "STOP") chrome.runtime.sendMessage({ type: "STOP" });
  });
})();
