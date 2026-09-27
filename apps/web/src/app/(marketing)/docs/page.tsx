import { docsPage } from "@/lib/agent/site-pages";

import { ProsePageView, prosePageMetadata } from "../_components/prose-page";

export const metadata = prosePageMetadata(docsPage);

const Page = () => <ProsePageView page={docsPage} />;

export default Page;
