import { authRouteFontLayoutClassName } from '@/lib/auth-route-fonts';

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={authRouteFontLayoutClassName}>{children}</div>;
}
