import { Shadows_Into_Light, Source_Code_Pro } from 'next/font/google';

/** Scoped to sign-in / sign-up so the root layout does not load display fonts on every route. */
const shadowsIntoLight = Shadows_Into_Light({
  variable: '--font-shadows-into-light',
  weight: '400',
  subsets: ['latin'],
});

const sourceCodePro = Source_Code_Pro({
  variable: '--font-source-code-pro',
  subsets: ['latin'],
});

export const authRouteFontLayoutClassName = `${shadowsIntoLight.variable} ${sourceCodePro.variable} min-h-screen`;
