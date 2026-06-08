import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface StartupIntroProps {
  onComplete: () => void;
}

export const StartupIntro: React.FC<StartupIntroProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<SVGSVGElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subtitleRef = useRef<HTMLParagraphElement | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          // Fade out the container and trigger callback
          gsap.to(containerRef.current, {
            opacity: 0,
            y: -50,
            duration: 0.8,
            ease: 'power4.inOut',
            onComplete: onComplete
          });
        }
      });

      // Reset values
      gsap.set(logoRef.current, { scale: 0.8, opacity: 0 });
      gsap.set(titleRef.current, { opacity: 0, y: 20 });
      gsap.set(subtitleRef.current, { opacity: 0, y: 10 });
      gsap.set(lineRef.current, { scaleX: 0 });

      // 1. Draw logo
      tl.to(logoRef.current, {
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: 'power3.out'
      })
      // 2. Draw gold line separating
      .to(lineRef.current, {
        scaleX: 1,
        duration: 0.8,
        ease: 'power2.inOut'
      }, "-=0.4")
      // 3. Fade in Title letters
      .to(titleRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out'
      }, "-=0.3")
      // 4. Fade in Subtitle
      .to(subtitleRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out'
      }, "-=0.4")
      // 5. Hold screen
      .to({}, { duration: 1.2 }); // Hold for luxury effect
    });

    return () => ctx.revert();
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-[#030303] z-[99999] flex flex-col items-center justify-center pointer-events-none"
    >
      <div className="flex flex-col items-center space-y-6 max-w-md px-8 text-center">
        {/* Animated Premium Monogram SVG */}
        <svg
          ref={logoRef}
          className="w-24 h-24 text-luxury-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Circle */}
          <circle cx="50" cy="50" r="46" fill="#F4F2EB" stroke="#d4af37" strokeWidth="2.5" />
          
          {/* Mannequin stand top (dark grey) */}
          <circle cx="50" cy="20" r="4.5" fill="#2C2A29" />
          <path d="M47 24.5 C47 24.5 48 31 46 33 H54 C52 31 53 24.5 53 24.5 Z" fill="#2C2A29" />
          
          {/* White Shirt Collar */}
          <path d="M40 33 L50 46 L60 33 L50 35 Z" fill="#FFFFFF" stroke="#2C2A29" strokeWidth="1" />
          <path d="M40 33 L50 46 L46 33 Z" fill="#FFFFFF" stroke="#2C2A29" strokeWidth="1" />
          <path d="M60 33 L50 46 L54 33 Z" fill="#FFFFFF" stroke="#2C2A29" strokeWidth="1" />
          
          {/* Dark Tie */}
          <path d="M48.5 46 L51.5 46 L53 51 L47 51 Z" fill="#2C2A29" />
          <path d="M47 51 L53 51 L51.5 75 L48.5 75 Z" fill="#2C2A29" />
          
          {/* Suit Coat (Dark Grey) */}
          <path d="M22 55 C22 41 41 33 41 33 L47 64 L37 86 C31 82 22 72 22 55 Z" fill="#2C2A29" stroke="#E5E3DB" strokeWidth="1.2" />
          <path d="M78 55 C78 41 59 33 59 33 L53 64 L63 86 C69 82 78 72 78 55 Z" fill="#2C2A29" stroke="#E5E3DB" strokeWidth="1.2" />
          
          {/* Pocket Square (White) */}
          <rect x="63" y="55" width="8" height="3" transform="rotate(-15 63 55)" fill="#FFFFFF" />
        </svg>

        <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-luxury-gold/50 to-transparent relative">
          <div ref={lineRef} className="absolute inset-0 bg-gold-gradient origin-center" />
        </div>

        <div className="space-y-2">
          <h1
            ref={titleRef}
            className="text-2xl md:text-3xl font-extrabold tracking-[0.25em] text-white uppercase font-sans select-none"
          >
            A TOWN LUXURY
          </h1>
          <p
            ref={subtitleRef}
            className="text-[9px] uppercase tracking-[0.4em] text-luxury-gold font-bold select-none"
          >
            CLOTHING SHOWROOM
          </p>
        </div>
      </div>
    </div>
  );
};
