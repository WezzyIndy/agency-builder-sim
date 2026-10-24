// src/ui/main.js
//
// App controller. Holds the current run and view state, routes every player
// action through the engine reducer (no game logic lives in the UI), autosaves
// after every applied decision, and re-renders.

import { createRun, tryDecision } from '../engine/run.js';
import { newSeed } from '../engine/rng.js';
import { scoreRecord } from '../engine/scoring.js';
import { PLAYABLE_BUSINESSES } from '../content/index.js';
import { screenFor } from './flow.js';
import { loadRun, saveRun, clearRun, loadScores, addScore, loadSettings, saveSettings, storageAvailable, clearAll } from './storage.js';
import { h } from './dom.js';
import { renderMenu } from './screens/menu.js';
import { renderBrief } from './screens/brief.js';
import { renderOnboarding } from './screens/onboarding.js';
import { renderSetup } from './screens/setup.js';
import { renderWeek } from './screens/week.js';
import { renderRoundDebrief } from './screens/roundDebrief.js';
import { renderFinalDebrief } from './screens/finalDebrief.js';
import { renderSettings } from './screens/settings.js';

const root = document.getElementById('app');
const topRight = document.getElementById('topbar-right');

const saved = loadRun();
const app = {
  run: saved.run,
  settings: loadSettings(),
  scores: loadScores(),
  canSave: storageAvailable(),
  view: { screen: saved.run ? 'menu' : 'menu', debriefWeek: null, notice: saved.corrupt ? 'Your saved game could not be read, so it was cleared.' : null, draft: null, edit: null, finalCache: null },
};

const SCREENS = {
  menu: renderMenu,
  brief: renderBrief,
  onboarding: renderOnboarding,
  setup: renderSetup,
  week: renderWeek,
  roundDebrief: renderRoundDebrief,
  final: renderFinalDebrief,
  settings: renderSettings,
};

const actions = {
  /** Applies a decision through the engine. Returns true on success; shows the reason on failure. */
  decide(decision) {
    const r = tryDecision(app.run, decision);
    if (!r.ok) {
      app.view.notice = r.error;
      render();
      return false;
    }
    app.run = r.state;
    app.view.notice = null;
    if (app.run.status === 'final') {
      app.scores = addScore(scoreRecord(app.run, Date.now()));
      clearRun();
    } else if (app.canSave) saveRun(app.run);
    render();
    return true;
  },
  /** Opens the business picker on the menu. */
  newRun() {
    app.view = { ...app.view, screen: 'menu', debriefWeek: null, notice: null, picking: true };
    render(true);
  },
  /** Starts a client for a business ('any' picks one at random). */
  startRun(businessId) {
    const id = businessId === 'any' ? PLAYABLE_BUSINESSES[Math.floor(Math.random() * PLAYABLE_BUSINESSES.length)] : businessId;
    app.run = createRun({
      seed: newSeed(),
      businessId: id,
      level: 1,
      realism: app.settings.realismDefault,
      targetHourly: app.settings.targetHourlyRate,
    });
    app.view = { ...app.view, screen: null, debriefWeek: null, notice: null, draft: null, edit: null, adding: null, finalCache: null, picking: false };
    if (app.canSave) saveRun(app.run);
    render(true);
  },
  /** Realism can change only on the brief screen; the brief itself doesn't depend on it. */
  setRealism(realism) {
    if (!app.run || app.run.status !== 'brief') return;
    app.run = createRun({ ...app.run.options, realism });
    if (app.canSave) saveRun(app.run);
    render();
  },
  resume() {
    app.view.screen = null;
    render(true);
  },
  toMenu() {
    app.view.screen = 'menu';
    app.view.picking = false;
    app.view.debriefWeek = null;
    render(true);
  },
  openSettings() {
    app.view.screen = 'settings';
    render(true);
  },
  closeSettings() {
    app.view.screen = app.run && app.run.status !== 'final' ? null : 'menu';
    render(true);
  },
  saveSettings(settings) {
    app.settings = { ...app.settings, ...settings };
    saveSettings(app.settings);
    render();
  },
  clearData() {
    clearAll();
    app.run = null;
    app.scores = [];
    app.settings = loadSettings();
    app.view = { screen: 'menu', debriefWeek: null, notice: 'Saved game and score history cleared.', draft: null, edit: null, finalCache: null };
    render(true);
  },
  showDebrief(week) {
    app.view.debriefWeek = week;
    render(true);
  },
  closeDebrief() {
    app.view.debriefWeek = null;
    render(true);
  },
  setView(patch, scroll = false) {
    Object.assign(app.view, patch);
    render(scroll);
  },
  dismissNotice() {
    app.view.notice = null;
    render();
  },
};

function renderTopbar(screen) {
  topRight.replaceChildren();
  const run = app.run;
  if (run && ['onboarding', 'setup', 'week', 'roundDebrief'].includes(screen)) {
    const label = run.status === 'onboarding' ? 'Onboarding' : run.status === 'setup' ? 'Setup' : `Week ${Math.min(run.weekIndex + 1, run.brief.campaignWeeks)}/${run.brief.campaignWeeks}`;
    topRight.append(h('span', { class: 'topbar-pill' }, label));
  }
  if (screen !== 'settings') topRight.append(h('button', { type: 'button', class: 'topbar-btn', onClick: actions.openSettings }, 'Settings'));
}

function render(scrollTop = false) {
  const screen = screenFor(app.run, app.view);
  renderTopbar(screen);
  const node = SCREENS[screen](app, actions);
  root.replaceChildren(node);
  if (scrollTop) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

document.getElementById('brand').addEventListener('click', actions.toMenu);
render();
