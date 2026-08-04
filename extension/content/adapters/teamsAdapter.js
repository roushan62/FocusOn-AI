/**
 * Microsoft Teams Web adapter.
 * Teams exposes people via roster list items with stable data-tid attributes,
 * the active speaker via speaking indicators, and live captions via
 * data-tid="closed-caption-*".
 */
(function () {
  const dom = window.FOI.dom;

  const teamsAdapter = {
    platform: "ms_teams",

    matchesLocation(loc) {
      return /(^|\.)teams\.(microsoft|live)\.com$/.test(loc.hostname);
    },

    getParticipantNames() {
      const names = new Set();
      dom.qsa(document, [
        '[data-tid="roster-list-item"] [data-tid="roster-item-name"]',
        '[data-tid="participants-list"] [data-tid*="name"]',
        '[data-tid="roster-item-name"]'
      ]).forEach((el) => {
        const name = dom.cleanName(dom.text(el));
        if (name && name.length > 1) names.add(name);
      });
      // "People" pane fallback
      if (!names.size) {
        dom.qsa(document, ['li[data-inp] [class*="displayName"], [class*="tsDisplayName"]'])
          .forEach((el) => {
            const name = dom.cleanName(dom.text(el));
            if (name && name.length > 1) names.add(name);
          });
      }
      return [...names].slice(0, 60);
    },

    getActiveSpeakerName() {
      const el = dom.qs(document, [
        '[data-tid="voice-level-stream-outline"][data-cid*="speaking"] [data-tid*="name"]',
        '[class*="speaking"] [data-tid*="display-name"]',
        '[data-tid="participant-name-in-video"]'
      ]);
      if (el) return dom.cleanName(dom.text(el));
      return null;
    },

    getCaptionsContainer() {
      return dom.qs(document, [
        '[data-tid="closed-caption-renderer-wrapper"]',
        '[data-tid="closed-captions-renderer"]',
        '[class*="caption"] [role="log"]'
      ]);
    },

    parseCaptionNode(node) {
      // Teams caption rows: author name in data-tid="closed-caption-*" author span
      const authorEl = node.querySelector?.(
        '[data-tid="closed-caption-author"], [class*="CaptionAuthor"], [class*="authorName"]'
      );
      const textEl = node.querySelector?.(
        '[data-tid="closed-caption-text"], [class*="ui-caption__message"], [class*="captionContent"]'
      );
      const text = textEl ? dom.text(textEl) : dom.text(node);
      if (!text) return null;
      return { name: authorEl ? dom.cleanName(dom.text(authorEl)) : null, text };
    }
  };

  window.FOI.adapter = teamsAdapter;
})();
