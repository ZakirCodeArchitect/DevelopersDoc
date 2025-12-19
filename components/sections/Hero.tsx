import React from 'react';

interface HeroProps {
  title?: string;
  description?: string;
  primaryCta?: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
}

export const Hero: React.FC<HeroProps> = () => {
  return (
    <section className="py-12 md:py-20 lg:py-24 relative overflow-hidden bg-gray-50">
      {/* Background Clouds */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-16 bg-white rounded-full opacity-40 blur-xl"></div>
        <div className="absolute top-40 right-32 w-40 h-20 bg-white rounded-full opacity-40 blur-xl"></div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[600px]">
          {/* Left Side - Text Content */}
          <div className="flex flex-col justify-center space-y-5">
            <div className="space-y-2">
              <p className="text-sm md:text-base text-gray-600 font-medium">
                Build beautiful documentation.
              </p>
              <p className="text-sm md:text-base text-gray-600 font-medium">
                Write, collaborate, and share with your team.
              </p>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-black">
              Developers,
              <br />
              <span className="relative inline-block">
                Doc
                <svg
                  className="absolute left-0 bottom-0 w-full"
                  height="6"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                  style={{ transform: 'rotate(-2deg)' }}
                >
                  <path
                    d="M 5 4 Q 50 1, 95 4"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    className="text-black"
                  />
                </svg>
              </span>
            </h1>
            <a 
              href="#get-started" 
              className="inline-flex items-center gap-2 text-base md:text-lg text-gray-700 hover:text-gray-900 font-medium mt-6 transition-colors"
            >
              Get started
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M13 7l5 5m0 0l-5 5m5-5H6" 
                />
              </svg>
            </a>
          </div>

          {/* Right Side - Laptop with Document Editor */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="relative z-10">
              {/* Laptop */}
              <div className="relative w-full max-w-[600px]">
                {/* Laptop Screen */}
                <div className="relative bg-gradient-to-b from-gray-800 to-black rounded-t-lg rounded-tl-[14px] rounded-tr-[14px] p-[3px] shadow-2xl">
                  {/* Screen Bezel */}
                  <div className="bg-black rounded-t-[10px] p-[6px] relative">
                    {/* Camera/Notch */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-gray-800 rounded-full"></div>
                    
                    {/* Screen Content */}
                    <div className="bg-gray-50 rounded-lg overflow-hidden h-[420px] shadow-inner border border-gray-300">
                      {/* Editor Toolbar */}
                      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-xs text-gray-700 font-medium">getting-started.md</span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <input 
                            type="text" 
                            placeholder="search documentations.." 
                            className="text-[10px] px-3 py-1.5 border border-gray-300 rounded bg-gray-50 w-40 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Document Editor Content */}
                      <div className="p-8 h-[calc(100%-48px)] overflow-y-auto bg-white">
                        <div className="max-w-3xl mx-auto space-y-5 font-sans">
                          {/* Document Title */}
                          <div className="space-y-3">
                            <div className="text-3xl font-bold text-gray-900">Creating a layout </div>
                            <div className="h-px bg-gray-200 w-full"></div>
                          </div>

                          {/* Document Paragraphs */}
                          <div className="space-y-4 pt-2 text-gray-700 leading-relaxed">
                            <p className="text-base">
                            A layout is UI that is shared between multiple pages. On navigation, layouts preserve state, remain interactive, and do not rerender.
                            </p>

                            {/* Code Block */}
                            <div className="mt-6 bg-gray-900 rounded-lg p-5 font-mono text-sm">
                              <div className="text-gray-400 mb-2 text-xs">// Example code</div>
                              <div className="space-y-1.5 text-gray-300">
                                <div><span className="text-purple-400">const</span> <span className="text-blue-400">docs</span> = <span className="text-green-400">'Amazing'</span>;</div>
                                <div><span className="text-purple-400">function</span> <span className="text-blue-400">createDocs</span>() {'{'}</div>
                                <div className="pl-4"><span className="text-blue-400">console</span>.<span className="text-yellow-400">log</span>(docs);</div>
                                <div>{'}'}</div>
                              </div>
                            </div>

                            {/* More Content */}
                            <div className="space-y-3 pt-2">
                              <h3 className="text-xl font-bold text-gray-900">Creating a nested route</h3>
                              <p className="text-base">
                                A nested route is a route composed of multiple URL segments. For example, the <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono">/blog/[slug]</code> route is composed of three segments:
                              </p>

                              {/* List Items */}
                              <ul className="space-y-2 pt-2 list-none">
                                <li className="flex items-start gap-3">
                                  <span className="text-gray-400 mt-1">-</span>
                                  <div className="flex items-center gap-2">
                                    <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">/</code>
                                    <span className="text-base text-gray-600">(Root Segment)</span>
                                  </div>
                                </li>
                                <li className="flex items-start gap-3">
                                  <span className="text-gray-400 mt-1">-</span>
                                  <div className="flex items-center gap-2">
                                    <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">blog</code>
                                    <span className="text-base text-gray-600">(Segment)</span>
                                  </div>
                                </li>
                                <li className="flex items-start gap-3">
                                  <span className="text-gray-400 mt-1">-</span>
                                  <div className="flex items-center gap-2">
                                    <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">[slug]</code>
                                    <span className="text-base text-gray-600">(Leaf Segment)</span>
                                  </div>
                                </li>
                              </ul>
                            </div>

                            {/* Navigation Footer */}
                            <div className="pt-6 mt-6 border-t border-gray-200">
                              <div className="text-[10px] text-gray-500 text-right mb-3">
                                Last updated on December 4, 2022
                              </div>
                              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                <a href="#" className="text-xs text-gray-700 hover:text-gray-900">
                                  &lt; Introduction
                                </a>
                                <a href="#" className="text-xs text-gray-700 hover:text-gray-900">
                                  Advanced (A Folder) &gt;
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Laptop Base */}
                <div className="relative -mt-1 bg-gradient-to-b from-gray-300 to-gray-400 h-6 rounded-b-lg shadow-2xl">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-b from-gray-400 to-gray-300 rounded-t"></div>
                  {/* Trackpad Indicator */}
                  <div className="absolute inset-x-12 top-2 h-3 bg-gray-500 rounded-lg opacity-30"></div>
                  {/* Bottom Edge Glow */}
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gray-500"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

