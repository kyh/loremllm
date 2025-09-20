import { Header } from "./_components/header";

type LayoutProps = {
  children: React.ReactNode;
};

const Layout = (props: LayoutProps) => {
  return (
    <div className="contained-page">
      <Header />
      {props.children}
    </div>
  );
};

export default Layout;
