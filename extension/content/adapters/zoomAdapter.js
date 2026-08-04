/**
 * Zoom Web Client adapter.
 * Zoom web runs inside its own shell; participant names come from the
 * participants panel, active speaker from aria indicators, captions from
 * the closed-caption region.
 */
(function () {
  const dom = window.FOI.dom;

  const zoomAdapter = {
    platform: "zoom",

    matchesLocation(loc) {
      return /(^|\.)zoom\.us$/.test(loc.hostname) || /(^|\.)zoom\.com$/.test(loc.hostname);
    },

    getParticipantNames() {
      const names = new Set();
      dom.qsa(document, [
        '.participants-item__display-name',
        '.participants-li .participants-item__name',
        '[class*="participant"] [class*="display-name"]',
        '.participants-container .participants-name'
      ]).forEach((el) => {
        const name = dom.cleanName(dom.text(el));
        if (name && name.length > 1) names.add(name);
      });
      return [...names].slice(0, 40);
    },

    getActiveSpeakerName() {
      const el = dom.qs(document, [
        '[aria-label*="is speaking" i]',
        '[class*="speaking-indicator"] [class*="name"]',
        '.active-speaker [class*="display-name"]'
      ]);
      if (el) {
        const aria = el.getAttribute("aria-label") || "";
        const speaking = aria.replace(/\s*is speaking\s*/i, "");
        return dom.cleanName(speaking || dom.text(el));
      }
      return null;
    },

    getCaptionsContainer() {
      return dom.qs(document, [
        '.live-transcription-subtitle__box',
        '[class*="closed-caption"] [class*="content"]',
        '.subtitle-container'
      ]);
    },

    parseCaptionNode(node) {
      const text = dom.text(node);
      if (!text) return null;
      // Zoom captions sometimes prefix "Name: text"
      const m = text.match(/^([^:]{2,60}):\s+(.+)$/);
      if (m) return { name: dom.cleanName(m[1]), text: m[2] };
      return { name: null, text };
    }
  };

  window.FOI.adapter = zoomAdapter;
})();
