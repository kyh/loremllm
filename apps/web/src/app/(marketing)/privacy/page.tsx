import { privacyPage } from "@/lib/agent/site-pages";

import { ProsePageView, prosePageMetadata } from "@/components/marketing/prose-page";

export const metadata = prosePageMetadata(privacyPage);

const Page = () => <ProsePageView page={privacyPage} />;

export default Page;
