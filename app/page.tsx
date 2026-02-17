import { Header } from '@/components/sections/Header';
import { Hero } from '@/components/sections/Hero';
import { Features } from '@/components/sections/Features';
import { DeveloperSection } from '@/components/sections/DeveloperSection';
import { Footer } from '@/components/sections/Footer';

export default function Home() {
  // Navigation links for header
  const navLinks = [
    { label: 'About', href: '#about' },
    { label: 'Contact', href: 'mailto:zakirmatloob149@gmail.com', external: true },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        logoText="Developers Doc"
        navLinks={navLinks}
      />
      
      <main className="flex-1">
        <Hero
          title="Build Amazing Developer Documentation"
          description="Create beautiful, comprehensive documentation for your projects. Everything you need to help developers understand and use your tools."
          primaryCta={{
            text: 'Get Started',
            href: '/docs',
          }}
          secondaryCta={{
            text: 'View Documentation',
            href: '#docs',
          }}
        />
        
        <Features />
        
        <DeveloperSection />
      </main>
      
      <Footer
        logoText="Developers Doc"
        slogan="Building the best developer documentation tools for modern teams."
      />
    </div>
  );
}
