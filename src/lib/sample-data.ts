/**
 * Telling demo data apart from the team's real data.
 *
 * Every record the seed creates gets a fixed, prefixed id such as
 * `tool_torque`. Records created through the app get a cuid, which never
 * starts with one of these prefixes. So the question "is this sample data?"
 * is answerable from the id alone, with no extra column to maintain and no
 * risk of a real item being swept up by a bulk clear-out.
 */

export const SAMPLE_PREFIXES = {
  tool: "tool_",
  location: "loc_",
  user: "usr_",
  request: "req_",
  ticket: "tkt_",
  log: "log_",
} as const;

export function isSampleTool(id: string): boolean {
  return id.startsWith(SAMPLE_PREFIXES.tool);
}

export function isSampleLocation(id: string): boolean {
  return id.startsWith(SAMPLE_PREFIXES.location);
}
