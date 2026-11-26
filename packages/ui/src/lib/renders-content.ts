import type { ReactNode } from "react";

/** Whether React renders anything for `node`: not nullish, a boolean or an empty string. */
export const rendersContent = (node: ReactNode) =>
  node !== undefined && node !== null && node !== false && node !== true && node !== "";
