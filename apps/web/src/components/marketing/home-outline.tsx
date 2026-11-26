import { ProseLink } from "@/components/prose-link";
import {
  agentEndpoints,
  siteIntroParagraphs,
  siteUsageParagraphs,
  whenToUse,
} from "@/lib/agent/site-overview";

import type { ProseListItem } from "@/lib/agent/site-pages";

const OutlineList = ({ items }: { items: ProseListItem[] }) => (
  <ul>
    {items.map((item) => (
      <li key={item.label}>
        {item.href !== undefined && item.href !== "" ? (
          <ProseLink href={item.href} prefetch={false} tabIndex={-1}>
            {item.label}
          </ProseLink>
        ) : (
          item.label
        )}
        {item.text !== undefined && item.text !== "" ? ` — ${item.text}` : null}
      </li>
    ))}
  </ul>
);

export const HomeOutline = () => (
  <section aria-labelledby="home-outline-heading" className="sr-only">
    <h2 id="home-outline-heading">What LoremLLM is</h2>
    {siteIntroParagraphs.map((paragraph) => (
      <p key={paragraph}>{paragraph}</p>
    ))}
    <h2>When to use LoremLLM</h2>
    <OutlineList items={whenToUse} />
    <h2>How to use it</h2>
    {siteUsageParagraphs.map((paragraph) => (
      <p key={paragraph}>{paragraph}</p>
    ))}
    <h2>Machine-readable endpoints</h2>
    <OutlineList items={agentEndpoints} />
  </section>
);
