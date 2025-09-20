import { RootProvider } from "fumadocs-ui/provider";

type LayoutProps = {
  children: React.ReactNode;
};

const Layout = (props: LayoutProps) => (
  <RootProvider>{props.children}</RootProvider>
);

export default Layout;
