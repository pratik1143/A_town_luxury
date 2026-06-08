import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export const AnimatedCursor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorText, setCursorText] = useState('');
  
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 250 };
  const cursorRingX = useSpring(cursorX, springConfig);
  const cursorRingY = useSpring(cursorY, springConfig);

  useEffect(() => {
    // Disable custom cursor on touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    setIsVisible(true);
    document.body.classList.add('custom-cursor-active');

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if target is interactive
      const isLink = target.closest('a') || target.closest('button') || target.closest('[role="button"]') || target.closest('select') || target.closest('input') || target.closest('textarea') || target.classList.contains('clickable');
      
      if (isLink) {
        setIsHovered(true);
        // Custom text label on specific overlays
        const label = target.getAttribute('data-cursor-label');
        if (label) {
          setCursorText(label);
        } else {
          setCursorText('');
        }
      } else {
        setIsHovered(false);
        setCursorText('');
      }
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      document.body.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [cursorX, cursorY]);

  if (!isVisible) return null;

  return (
    <>
      {/* Outer Ring Spring Follower */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-luxury-bronze pointer-events-none z-[9999] flex items-center justify-center"
        style={{
          x: cursorRingX,
          y: cursorRingY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: isHovered ? 48 : 28,
          height: isHovered ? 48 : 28,
          backgroundColor: isHovered ? 'rgba(197, 168, 128, 0.08)' : 'rgba(0, 0, 0, 0)',
          borderColor: isHovered ? '#d4af37' : '#c5a880',
        }}
        transition={{ type: 'tween', duration: 0.15 }}
      >
        {cursorText && (
          <span className="text-[7px] font-bold text-luxury-gold uppercase tracking-wider select-none">
            {cursorText}
          </span>
        )}
      </motion.div>

      {/* Inner Dot Follower */}
      <motion.div
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-luxury-gold rounded-full pointer-events-none z-[10000]"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isHovered ? 0 : 1,
        }}
        transition={{ type: 'tween', duration: 0.1 }}
      />
    </>
  );
};
