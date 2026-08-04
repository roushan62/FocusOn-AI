/**
 * Content-script orchestrator. Watches the meeting DOM with a
 * MutationObserver + gentle polling and streams ContextEvents
 * (participants / speaking / captions / chat) to the service worker.
 * Everything is best-effort: if a platform changes its markup the meeting
 * continues — timestamps from audio remain the source of truth.
 */
(function () {
  const adapter = window.FOI.adapter;
  if (!adapter || !adapter.matchesLocation(window.location)) return;

  const state = {
    participants: [],
    lastSpeaker: null,
    captionsSeen: new Set(),
    active: false
  };

  function send(event) {
    try {
      chrome.runtime.sendMessage(
        { channel: "foi-context", platform: adapter.platform, event },
        () => void chrome.runtime.lastError // SW may be asleep; that's fine
      );
    } catch (_) { /* extension context invalidated (reload) — ignore */ }
  }

  function nowMs() {
    return Date.now(); // SW converts to meeting-relative ms
  }

  function pollParticipants() {
    const names = adapter.getParticipantNames();
    const changed =
      names.length !== state.participants.length ||
      names.some((n, i) => state.participants[i] !== n);
    if (changed) {
      state.participants = names;
      send({ type: "participants", atMs: nowMs(), payload: { names } });
    }
    const speaker = adapter.getActiveSpeakerName();
    if (speaker && speaker !== state.lastSpeaker) {
      state.lastSpeaker = speaker;
      send({ type: "speaking", atMs: nowMs(), name: speaker });
    }
  }

  // Watch captions with a MutationObserver (cheap; container is small).
  let captionsObserver = null;
  function watchCaptions() {
    const container = adapter.getCaptionsContainer();
    if (captionsObserver) captionsObserver.disconnect();
    if (!container) {
      // Captions may be enabled later — retry on the next poll tick.
      captionsObserver = null;
      return;
    }
    captionsObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          const parsed = adapter.parseCaptionNode(node);
          if (!parsed || !parsed.text) continue;
          const key = `${parsed.name}|${parsed.text}`;
          if (state.captionsSeen.has(key) || state.captionsSeen.size > 5000) continue;
          state.captionsSeen.add(key);
          send({
            type: "caption",
            atMs: nowMs(),
            name: parsed.name || undefined,
            text: parsed.text.slice(0, 600)
          });
        }
      }
    });
    captionsObserver.observe(container, { childList: true, subtree: true });
  }

  function tick() {
    try {
      pollParticipants();
      if (!captionsObserver) watchCaptions();
    } catch (_) { /* never break the meeting page */ }
  }

  // Light polling covers panel open/close and caption enabling.
  setInterval(tick, 5000);
  tick();

  // Respond to popup queries (pre-meeting who's-who autofill).
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg?.channel === "foi-query-participants") {
      reply({
        platform: adapter.platform,
        participants: state.participants.length ? state.participants : adapter.getParticipantNames()
      });
    }
    if (msg?.channel === "foi-query-platform") {
      reply({ platform: adapter.platform });
    }
    return true;
  });
})();
