import { privacyPage } from "@/lib/agent/site-pages";

import { ProsePageView, prosePageMetadata } from "../_components/prose-page";

export const metadata = prosePageMetadata(privacyPage);

const Page = () => <ProsePageView page={privacyPage} />;

export default Page;
