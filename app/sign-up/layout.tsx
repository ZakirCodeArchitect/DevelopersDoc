import { authRouteFontLayoutClassName } from '@/lib/auth-route-fonts';

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={authRouteFontLayoutClassName}>{children}</div>;
}
