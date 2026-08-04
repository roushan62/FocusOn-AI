/**
 * FocusOn Interiors working vocabulary, injected into every LLM prompt.
 * Keeping this list in one place guarantees every provider prompt uses the
 * same construction/interior-fit-out dictionary, which dramatically improves
 * extraction accuracy over a generic meeting-notes prompt (spec Section 6).
 */

export const DOMAIN_GLOSSARY: Array<[string, string]> = [
  ["BOQ", "Bill of Quantities"],
  ["HOD", "Handing Over Document"],
  ["NCN", "Non-Conformance Notice"],
  ["ACS", "Access Control System"],
  ["ELV", "Extra Low Voltage systems"],
  ["CCTV", "Closed-circuit television system"],
  ["PA", "Public Address system"],
  ["Rodent Control", "Rodent control treatment/system"],
  ["DB", "Distribution Board"],
  ["False Ceiling", "Suspended ceiling (gypsum/grid)"],
  ["Gypsum Board", "Drywall / gypsum partition board"],
  ["Snag / Snagging", "Defect list inspection before handover"],
  ["MEP", "Mechanical, Electrical and Plumbing"],
  ["RFI", "Request for Inspection / Information"],
  ["Retention Payment", "Payment withheld until defect liability period"],
  ["GF / FF / SF", "Ground / First / Second Floor"],
  ["B.O.S / B.O.B", "Bottom of Slab / Bottom of Beam"],
  ["Carpet Area", "Net usable floor area"],
  ["PMC", "Project Management Consultancy / Consultant"],
  ["EPC", "Engineering, Procurement and Construction"],
  ["LOI", "Letter of Intent"],
  ["PO", "Purchase Order"],
  ["GRN", "Goods Receipt Note"],
  ["Snag List", "Punch list of defects"],
  ["DLP", "Defect Liability Period"],
  ["Mock-up", "Sample room/finish for client approval"],
  ["Running Bill / RA Bill", "Running Account bill for progress payment"],
  ["HVAC", "Heating, Ventilation and Air Conditioning"],
  ["Fire NOC", "Fire department No-Objection Certificate"],
];

export const ROLE_LABELS: Record<string, string> = {
  client: "Client",
  pmc: "PMC",
  contractor: "Contractor",
  architect: "Architect",
  vendor: "Vendor",
  focuson: "FocusOn Team",
  unknown: "Unknown",
};

export const SCREEN_CATEGORIES = [
  "BOQ",
  "Drawing",
  "Excel",
  "Schedule/Gantt",
  "PPT",
  "RFI",
  "Email/Chat",
  "Video/People",
  "Other",
] as const;

export function glossaryPromptBlock(): string {
  const lines = DOMAIN_GLOSSARY.map(([term, meaning]) => `- ${term}: ${meaning}`);
  return [
    "DOMAIN GLOSSARY (FocusOn Interiors working vocabulary — preserve these terms exactly as spoken):",
    ...lines,
  ].join("\n");
}
