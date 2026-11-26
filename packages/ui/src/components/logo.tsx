import { cn } from "cn";

export const Logo = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h1 className={cn("flex items-center gap-2 text-base font-medium", className)} {...props}>
    <img src="/favicon/favicon-96x96.png" alt="" width={28} height={28} className="rounded-md" />
    LoremLLM
  </h1>
);
