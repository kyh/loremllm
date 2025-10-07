import { Header } from "./_components/header";

type LayoutProps = {
  children: React.ReactNode;
};

const Layout = (props: LayoutProps) => {
  return (
    <div className="px-5">
      <Header />
      {props.children}
    </div>
  );
};

export default Layout;
