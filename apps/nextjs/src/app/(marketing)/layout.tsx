import { Header } from "./_components/header";

type LayoutProps = {
  children: React.ReactNode;
};

const Layout = (props: LayoutProps) => {
  return (
    <div className="max-w-screen-md px-5">
      <Header />
      {props.children}
    </div>
  );
};

export default Layout;
