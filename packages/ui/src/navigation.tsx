"use client";

import * as React from "react";

type NavigationProps = {
  children?: React.ReactNode;
  logoHref?: string;
  logoTarget?: React.HTMLAttributeAnchorTarget;
  onClickLogo?: React.MouseEventHandler<HTMLButtonElement>;
  logo?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

const Navigation = ({
  children,
  logoHref,
  logoTarget,
  onClickLogo,
  logo,
  left,
  right,
}: NavigationProps) => {
  const logoClasses =
    "flex-shrink-0 px-[1ch] inline-flex text-theme-text bg-theme-border no-underline border-0 outline-0 rounded-none m-0 text-[var(--font-size)] visited:text-theme-text hover:text-theme-text hover:bg-theme-focused-foreground focus:outline-0 focus:border-0 focus:m-0 focus:px-[1ch] focus:bg-theme-focused-foreground";

  let logoElement = <button className={logoClasses}>{logo}</button>;

  if (onClickLogo) {
    logoElement = (
      <button className={logoClasses} onClick={onClickLogo}>
        {logo}
      </button>
    );
  }

  if (logoHref) {
    logoElement = (
      <a href={logoHref} className={logoClasses} target={logoTarget}>
        {logo}
      </a>
    );
  }

  return (
    <nav className="flex items-center justify-between bg-theme-border">
      {logoElement}
      <section className="flex-shrink-0">{left}</section>
      <section className="w-full min-w-[10%]">{children}</section>
      <section className="flex-shrink-0">{right}</section>
    </nav>
  );
};

export { Navigation };
