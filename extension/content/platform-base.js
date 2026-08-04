/**
 * MeetingPlatformAdapter interface + shared DOM-scraping utilities.
 * Each platform file assigns an adapter object to window.FOI.adapter.
 * Adapters are deliberately defensive: every selector can change, so all
 * lookups fail soft and return empty results instead of throwing.
 *
 * Adapter contract:
 *   platform: "google_meet" | "zoom" | "ms_teams"
 *   matchesLocation(location): boolean
 *   getParticipantNames(): string[]
 *   getActiveSpeakerName(): string | null
 *   get CaptionsContainer(): Element | null     (caption region if exposed)
 *   parseCaptionNode(node): { name: string|null, text: string } | null
 */

window.FOI = window.FOI || {};

window.FOI.dom = {
  qs(root, selectors) {
    for (const sel of selectors) {
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch (_) { /* invalid selector for this DOM — skip */ }
    }
    return null;
  },

  qsa(root, selectors) {
    const out = new Set();
    for (const sel of selectors) {
      try {
        root.querySelectorAll(sel).forEach((el) => out.add(el));
      } catch (_) { /* skip */ }
    }
    return [...out];
  },

  text(el) {
    return (el?.innerText || el?.textContent || "").trim();
  },

  /** normalize a display name; strips platform suffixes like "(You)" / "me" */
  cleanName(raw) {
    if (!raw) return "";
    return raw
      .replace(/\((you|host|me|guest|external)\)/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 80);
  }
};
