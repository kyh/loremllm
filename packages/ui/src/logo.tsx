import { cn } from "./utils";

export const Logo = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h1 className={cn("scale-75 font-mono", className)} {...props}>
    &nbsp;&nbsp;&nbsp;&nbsp;__&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;__&nbsp;&nbsp;&nbsp;&nbsp;__&nbsp;&nbsp;&nbsp;&nbsp;__&nbsp;&nbsp;___
    &nbsp;&nbsp;&nbsp;/&nbsp;/&nbsp;&nbsp;&nbsp;____&nbsp;&nbsp;________&nbsp;&nbsp;____&nbsp;___&nbsp;&nbsp;/&nbsp;/&nbsp;&nbsp;&nbsp;/&nbsp;/&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;|/&nbsp;&nbsp;/
    &nbsp;&nbsp;/&nbsp;/&nbsp;&nbsp;&nbsp;/&nbsp;__&nbsp;\/&nbsp;___/&nbsp;_&nbsp;\/&nbsp;__&nbsp;`__&nbsp;\/&nbsp;/&nbsp;&nbsp;&nbsp;/&nbsp;/&nbsp;&nbsp;&nbsp;/&nbsp;/|_/&nbsp;/&nbsp;
    &nbsp;/&nbsp;/___/&nbsp;/_/&nbsp;/&nbsp;/&nbsp;&nbsp;/&nbsp;&nbsp;__/&nbsp;/&nbsp;/&nbsp;/&nbsp;/&nbsp;/&nbsp;/___/&nbsp;/___/&nbsp;/&nbsp;&nbsp;/&nbsp;/&nbsp;&nbsp;
    /_____/\____/_/&nbsp;&nbsp;&nbsp;\___/_/&nbsp;/_/
    /_/_____/_____/_/&nbsp;&nbsp;/_/
  </h1>
);
