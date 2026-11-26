import { RootProvider } from "fumadocs-ui/provider/next";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = (props: LayoutProps) => (
  <RootProvider theme={{ enabled: false }}>{props.children}</RootProvider>
);

export default Layout;
