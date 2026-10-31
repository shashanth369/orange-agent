import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Crosshair,
  Globe2,
  Hand,
  Keyboard,
  LoaderCircle,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Square,
  TerminalSquare,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

type RunState = "idle" | "running" | "paused" | "complete" | "stopped";

type ActionStep = {
  id: string;
  title: string;
  description: string;
  intent: string;
  icon: typeof Globe2;
  cursor: { x: number; y: number };
  actionType?: string;
};

const defaultSteps: ActionStep[] = [
  {
    id: "01",
    title: "Open related website",
    description: "Find the right place to research the goal",
    intent: "Get the best research surface into view",
    icon: Globe2,
    cursor: { x: 15, y: 12 },
  },
  {
    id: "02",
    title: "Research the goal",
    description: "Locate a useful search or research field",
    intent: "Prepare the page for a focused search",
    icon: Crosshair,
    cursor: { x: 48, y: 41 },
  },
  {
    id: "03",
    title: "Enter the goal",
    description: "Type the user's research goal",
    intent: "Translate the goal into a clear query",
    icon: Keyboard,
    cursor: { x: 55, y: 41 },
  },
  {
    id: "04",
    title: "Submit search",
    description: "Click the search action",
    intent: "Run the first useful browser action",
    icon: MousePointer2,
    cursor: { x: 79, y: 41 },
  },
  {
    id: "05",
    title: "Review first result",
    description: "Open the strongest matching result",
    intent: "Continue toward a useful answer",
    icon: ArrowUpRight,
    cursor: { x: 35, y: 70 },
  },
];

const initialActivity = [
  { time: "14:32:06", text: "Agent planner ready", detail: "Prompt-driven action sequence", tone: "neutral" },
  { time: "14:32:06", text: "Browser bridge connected", detail: "Chrome · 1 active tab", tone: "success" },
];

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function planToActionSteps(plan: Array<{ type: string; label: string; reason: string }>): ActionStep[] {
  const icons = { navigate: Globe2, observe: Crosshair, focus: Crosshair, type: Keyboard, click: MousePointer2, scroll: ArrowDownToLine, extract: Search, wait: Clock3, verify: ShieldCheck } as const;
  return plan.map((step, index) => ({
    id: String(index + 1).padStart(2, "0"),
    title: step.label,
    description: step.reason,
    intent: step.reason,
    icon: icons[step.type as keyof typeof icons] ?? Crosshair,
    cursor: { x: 18 + ((index * 17) % 66), y: 16 + ((index * 21) % 58) },
    actionType: step.type,
  }));
}

function StatusBadge({ state }: { state: RunState }) {
  const copy = {
    idle: "Ready",
    running: "Running",
    paused: "Paused",
    complete: "Complete",
    stopped: "Stopped",
  }[state];

  return (
    <span className={`status-badge status-${state}`}>
      <span className="status-dot" />
      {copy}
    </span>
  );
}

export default function Home() {
  const [goal, setGoal] = useState("Find the best noise-cancelling headphones under $300");
  const [steps, setSteps] = useState<ActionStep[]>(defaultSteps);
  const [runState, setRunState] = useState<RunState>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [activity, setActivity] = useState(initialActivity);
  const [runId, setRunId] = useState(0);
  const [isPlanning, setIsPlanning] = useState(false);
  const planner = trpc.agent.plan.useMutation();

  const activeStep = steps[Math.min(currentStep, steps.length - 1)];
  const isActive = runState === "running" || runState === "paused";
  const progress = runState === "complete" ? 100 : Math.round((currentStep / steps.length) * 100);

  useEffect(() => {
    if (runState !== "running") return;
    if (currentStep >= steps.length - 1) {
      const completionTimer = window.setTimeout(() => {
        setRunState("complete");
        setActivity((items) => [
          { time: formatClock(new Date()), text: "Mission complete", detail: "Result ready for review", tone: "success" },
          ...items,
        ]);
      }, 1600);
      return () => window.clearTimeout(completionTimer);
    }

    const timer = window.setTimeout(() => {
      setCurrentStep((step) => step + 1);
    }, 2100);
    return () => window.clearTimeout(timer);
  }, [currentStep, runState, runId]);

  useEffect(() => {
    if (runState !== "running" || currentStep !== 2) {
      if (currentStep < 2) setTypedText("");
      if (currentStep > 2) setTypedText(goal);
      return;
    }

    const query = goal;
    let index = 0;
    setTypedText("");
    const typeTimer = window.setInterval(() => {
      index += 1;
      setTypedText(query.slice(0, index));
      if (index === query.length) window.clearInterval(typeTimer);
    }, 52);
    return () => window.clearInterval(typeTimer);
  }, [currentStep, runState, runId, goal]);

  useEffect(() => {
    if (!isActive) return;
    setActivity((items) => {
      const next = {
        time: formatClock(new Date()),
        text: activeStep.title,
        detail: activeStep.intent,
        tone: "active",
      };
      if (items[0]?.text === next.text) return items;
      return [next, ...items].slice(0, 5);
    });
  }, [activeStep, isActive]);

  const cursorPosition = useMemo(() => {
    if (runState === "idle" || runState === "stopped") return steps[0].cursor;
    return activeStep.cursor;
  }, [activeStep, runState]);

  const runMission = async () => {
    if (!goal.trim() || isPlanning) return;
    setIsPlanning(true);
    setRunState("idle");
    setActivity([{ time: formatClock(new Date()), text: "Planning the mission", detail: "Turning the prompt into browser actions", tone: "active" }, ...initialActivity]);

    let generatedPlan: Array<{ type: string; label: string; reason: string; url?: string; selector?: string; text?: string; direction?: string; amount?: number; ms?: number }>;
    try {
      const response = await planner.mutateAsync({ goal: goal.trim(), currentUrl: window.location.href });
      setSteps(planToActionSteps(response.steps));
      generatedPlan = response.steps;
    } catch {
      generatedPlan = [
        { type: "navigate", url: "https://www.google.com/", label: "Open related website", reason: "Open a public research surface for the goal" },
        { type: "focus", selector: "textarea[name='q'], input[name='q']", label: "Research the goal", reason: "Find the page search field" },
        { type: "type", selector: "textarea[name='q'], input[name='q']", text: goal.trim(), label: "Enter the goal", reason: "Search for the user's requested outcome" },
        { type: "click", selector: "input[name='btnK'], button[aria-label*='Search'], button[type='submit']", label: "Submit search", reason: "Start the first research pass" },
        { type: "verify", selector: "main, #search, body", label: "Verify results", reason: "Confirm the page returned useful content" },
      ];
      setSteps(planToActionSteps(generatedPlan));
    }

    window.postMessage({
      source: "orange-agent",
      type: "RUN_PLAN",
      goal,
      plan: generatedPlan,
    }, "*");
    setCurrentStep(0);
    setTypedText("");
    setRunId((id) => id + 1);
    setRunState("running");
    setManualMode(false);
    setIsPlanning(false);
    setActivity([
      { time: formatClock(new Date()), text: "Mission started", detail: "Agent is taking the first step", tone: "active" },
      ...initialActivity,
    ]);
  };

  const pauseMission = () => {
    setRunState((state) => (state === "running" ? "paused" : "running"));
  };

  const stopMission = () => {
    setRunState("stopped");
    setActivity((items) => [
      { time: formatClock(new Date()), text: "Mission stopped", detail: "Browser left in a safe state", tone: "warning" },
      ...items,
    ]);
  };

  const resetMission = () => {
    setRunState("idle");
    setCurrentStep(0);
    setTypedText("");
    setManualMode(false);
    setActivity(initialActivity);
  };

  const activeTabGlow = isActive || runState === "complete";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup" aria-label="Orange Agent">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="brand-name">ORANGE <b>/</b> AGENT</span>
        </div>
        <div className="topbar-actions">
          <span className="bridge-status"><span className="bridge-pulse" /> Chrome companion ready</span>
        </div>
      </header>

      <main className="cockpit">
        <aside className="left-rail">
          <div className="rail-heading">
            <span className="section-eyebrow">MISSION CONTROL</span>
            <StatusBadge state={runState} />
          </div>

          <div className="goal-block">
            <label htmlFor="mission-goal">What should the agent do?</label>
            <textarea
              id="mission-goal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              rows={4}
              disabled={isActive}
            />
            <div className="goal-footnote"><ShieldCheck size={12} /> Runs locally through your browser bridge</div>
          </div>

          <div className="control-stack">
            {runState === "running" || runState === "paused" ? (
              <>
                <button className="primary-button" onClick={pauseMission}>
                  {runState === "running" ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                  {runState === "running" ? "Pause agent" : "Resume agent"}
                </button>
                <button className="secondary-button danger-button" onClick={stopMission}><Square size={14} fill="currentColor" /> Stop mission</button>
              </>
            ) : runState === "complete" ? (
              <>
                <button className="primary-button" onClick={runMission}><RotateCcw size={16} /> Run again</button>
                <button className="secondary-button" onClick={resetMission}><X size={14} /> Clear mission</button>
              </>
            ) : (
              <button className="primary-button" onClick={runMission} disabled={!goal.trim() || isPlanning}>
                {isPlanning ? <LoaderCircle size={16} className="spin" /> : <Play size={16} fill="currentColor" />} {isPlanning ? "Planning actions…" : "Plan & run mission"} <span className="button-shortcut">⌘ ↵</span>
              </button>
            )}
          </div>

          <div className="left-rail-footer">
            <button className={`takeover-button ${manualMode ? "selected" : ""}`} onClick={() => setManualMode((mode) => !mode)}>
              <Hand size={15} /> {manualMode ? "Manual takeover active" : "Take control manually"}
            </button>
            <p>Pause the agent anytime to interact with the browser yourself.</p>
          </div>
        </aside>

        <section className="stage-column">
          <div className="stage-header">
            <div>
              <span className="section-eyebrow">LIVE BROWSER</span>
              <h1>Agent viewport</h1>
            </div>
            <div className="stage-header-meta"><span className="live-indicator" /> live</div>
          </div>

          <div className={`browser-frame ${activeTabGlow ? "is-glowing" : ""} ${runState === "paused" ? "is-paused" : ""}`}>
            <div className="browser-topline">
              <div className="traffic-lights"><i /><i /><i /></div>
              <div className="browser-tabs">
                <div className={`browser-tab ${activeTabGlow ? "active" : ""}`}><Globe2 size={12} /><span>Research workspace</span><X size={11} /></div>
                <div className="browser-tab new-tab"><span>+</span></div>
              </div>
              <div className="browser-controls"><ArrowDownToLine size={13} /><span className="browser-menu">•••</span></div>
            </div>
            <div className="address-row">
              <div className="address-controls"><ChevronRight size={14} className="rotate-180" /><ChevronRight size={14} /><RotateCcw size={13} /></div>
              <div className="address-bar"><ShieldCheck size={12} /><span>research.local / explore</span></div>
              <div className="address-actions"><Star size={13} /><TerminalSquare size={13} /></div>
            </div>

            <div className="browser-page">
              <div className="page-noise" />
              <nav className="page-nav"><span className="page-logo">northstar</span><div><span>Library</span><span>Compare</span><span>Guides</span></div><button><Search size={14} /> Search</button></nav>
              <div className="page-content">
                <span className="page-label">NORTHSTAR / PRODUCT RESEARCH</span>
                <h2>Make your next decision<br /><i>with more signal.</i></h2>
                <p className="page-intro">Search across expert reviews, lab notes, and hands-on comparisons.</p>
                <div className={`fake-search ${currentStep >= 1 && isActive ? "focused" : ""} ${currentStep >= 2 ? "has-value" : ""}`}>
                  <Search size={17} />
                  <span className={typedText ? "typed-value" : "placeholder-value"}>{typedText || "What are you researching?"}</span>
                  <button className={currentStep >= 3 ? "search-ready" : ""}><Send size={15} /></button>
                </div>
                <div className="quick-links"><span>Trending now</span><span>Headphones</span><span>Home office</span><span>Travel tech</span></div>
                <div className="result-preview">
                  <div className="result-topline"><span>EDITOR'S PICKS</span><span>Updated 2h ago</span></div>
                  <div className="result-row"><div className="result-thumb"><span>quiet</span><b>comfort</b></div><div><h3>What makes a great daily headphone?</h3><p>Four things to listen for before you buy.</p></div><ArrowUpRight size={15} /></div>
                </div>
              </div>
              <div className="page-footer">NORTHSTAR RESEARCH <span>CURATED WITH CARE</span></div>

              <div
                className={`agent-cursor ${isActive ? "moving" : ""} ${runState === "paused" ? "cursor-paused" : ""} ${runState === "complete" ? "cursor-complete" : ""}`}
                style={{ left: `${cursorPosition.x}%`, top: `${cursorPosition.y}%` }}
              >
                <MousePointer2 size={28} fill="#ff6b2c" strokeWidth={1.5} />
                <span className="cursor-tag"><span>{runState === "paused" ? "Paused" : activeStep.title}</span><b /></span>
                {isActive && <span className="click-ripple" />}
              </div>
            </div>

            <div className="viewport-hud"><span className="hud-dot" /> {runState === "paused" ? "AGENT PAUSED" : runState === "complete" ? "MISSION COMPLETE" : isActive ? `STEP ${activeStep.id} · ${activeStep.title.toUpperCase()}` : "AGENT STANDBY"}<span className="hud-right">{manualMode ? "MANUAL" : "AUTO"}</span></div>
          </div>

        </section>

        <aside className="right-rail">
          <div className="rail-heading"><span className="section-eyebrow">MISSION</span><span className="mission-code">LIVE</span></div>
          <div className="mission-summary">
            <div className="summary-topline"><span>Current mission</span><span>{progress}%</span></div>
            <h2>{runState === "complete" ? "Mission complete" : runState === "stopped" ? "Mission stopped" : runState === "paused" ? "Agent is paused" : "Find the right fit"}</h2>
            <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
            <p>{runState === "complete" ? "The agent found a result worth reviewing." : runState === "stopped" ? "Nothing was submitted after the stop." : `${currentStep + 1} of ${steps.length} actions in view`}</p>
          </div>

          <div className="mission-list">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const complete = runState === "complete" || index < currentStep;
              const current = !complete && index === currentStep && (isActive || runState === "idle");
              return (
                <div className={`mission-step ${complete ? "complete" : ""} ${current ? "current" : ""}`} key={step.id}>
                  <div className="step-marker">{complete ? <Check size={12} strokeWidth={3} /> : current && isActive ? <LoaderCircle size={13} className="spin" /> : <Icon size={13} />}</div>
                  <div className="step-copy"><span className="step-id">{step.id} <i>{complete ? "DONE" : current ? "NOW" : "NEXT"}</i></span><b>{step.title}</b><small>{step.description}</small></div>
                </div>
              );
            })}
          </div>

          <div className="rail-rule" />
          <div className="activity-heading"><span>Activity log</span><span className="activity-live"><span /> live</span></div>
          <div className="activity-log">
            {activity.map((item, index) => (
              <div className={`activity-item ${item.tone}`} key={`${item.time}-${item.text}-${index}`}><span className="activity-time">{item.time}</span><span className="activity-line" /><div><b>{item.text}</b><small>{item.detail}</small></div></div>
            ))}
          </div>
          <button className="view-log-button">View full activity <ArrowUpRight size={13} /></button>
        </aside>
      </main>
    </div>
  );
}

function Star({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
}
