import type { ReactNode } from "react";

/** Whether React renders anything for `node`: not nullish, a boolean or an empty string. */
export const rendersContent = (node: ReactNode) =>
  node !== undefined && node !== null && node !== false && node !== true && node !== "";

const isNodeList = (node: ReactNode): node is Iterable<ReactNode> =>
  node instanceof Object && Symbol.iterator in node;

/** How many nodes React renders for `node`, nested lists flattened and empty nodes left out. */
export const countRenderedNodes: (node: ReactNode) => number = (node) =>
  isNodeList(node)
    ? Array.from(node, countRenderedNodes).reduce((total, count) => total + count, 0)
    : Number(rendersContent(node));
