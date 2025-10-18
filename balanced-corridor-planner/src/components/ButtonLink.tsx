import { AnchorHTMLAttributes } from "react";

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  label: string;
};

const ButtonLink = ({ label, className = "", ...rest }: ButtonLinkProps) => (
  <a
    {...rest}
    className={`inline-flex items-center justify-center rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-300 ${className}`}
  >
    {label}
  </a>
);

export default ButtonLink;
