/**
 * Google Meet adapter.
 * Meet renders participant names in tiles and the bottom people panel,
 * captions in a live region. Selectors are layered (newest → legacy).
 */
(function () {
  const dom = window.FOI.dom;

  const meetAdapter = {
    platform: "google_meet",

    matchesLocation(loc) {
      return /(^|\.)meet\.google\.com$/.test(loc.hostname);
    },

    getParticipantNames() {
      const names = new Set();
      // People panel list items
      dom.qsa(document, [
        '[data-participant-id] [data-self-name]',
        'div[role="listitem"] [data-self-name]',
        'div[role="listitem"] span.notranslate',
        '[jscontroller] [data-initial-participant-name]'
      ]).forEach((el) => {
        const raw = el.getAttribute("data-self-name") ||
          el.getAttribute("data-initial-participant-name") || dom.text(el);
        const name = dom.cleanName(raw);
        if (name) names.add(name);
      });
      // Active tiles carry an aria-label with the participant name
      dom.qsa(document, ['div[data-participant-id]']).forEach((tile) => {
        const name = dom.cleanName(tile.getAttribute("aria-label"));
        if (name && !/^(yourself|you)$/i.test(name)) names.add(name);
      });
      return [...names].slice(0, 40);
    },

    getActiveSpeakerName() {
      // Speaking tiles get a distinct border/animation; Meet also moves the
      // speaker to the first tile. Best-effort: look for tiles flagged via
      // data/aria hints first.
      const tile = dom.qs(document, [
        'div[data-participant-id][data-is-speaking="true"]',
        'div[data-participant-id][data-speaking="true"]',
        'div[data-participant-id].speaking'
      ]);
      if (tile) return dom.cleanName(tile.getAttribute("aria-label"));
      // Fallback: captions name (whoever's caption is newest).
      return null;
    },

    getCaptionsContainer() {
      return dom.qs(document, [
        'div[role="region"][aria-label="Captions"]',
        'div[aria-live="polite"].a4cQT',
        'div.a4cQT',
        'div[jsname="dsyhDe"]'
      ]);
    },

    parseCaptionNode(node) {
      // Meet caption blocks: name span + text span inside a caption "bubble".
      const text = dom.text(node);
      if (!text) return null;
      const nameEl = node.querySelector?.('.Kcik8, [jsname="Ne2nBc"]');
      let name = nameEl ? dom.cleanName(dom.text(nameEl)) : null;
      if (name && text.startsWith(name)) {
        return { name, text: text.slice(name.length).trim() };
      }
      return { name: name || null, text };
    }
  };

  window.FOI.adapter = meetAdapter;
})();
