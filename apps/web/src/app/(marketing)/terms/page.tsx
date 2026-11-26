import { termsPage } from "@/lib/agent/site-pages";

import { ProsePageView, prosePageMetadata } from "@/components/marketing/prose-page";

export const metadata = prosePageMetadata(termsPage);

const Page = () => <ProsePageView page={termsPage} />;

export default Page;
