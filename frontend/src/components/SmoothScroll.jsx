import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

const SmoothScroll = ({ children }) => {
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Measure content height and listen for resize
  useLayoutEffect(() => {
    const handleResize = () => {
      if (contentRef.current) {
        setContentHeight(contentRef.current.scrollHeight);
      }
    };
    handleResize();
    
    // Add ResizeObserver to watch for dynamic content changes
    const observer = new ResizeObserver(() => handleResize());
    if (contentRef.current) observer.observe(contentRef.current);
    
    window.addEventListener("resize", handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [children]);

  // Framer Motion Scroll Hooks
  const { scrollY } = useScroll();
  const transform = useTransform(scrollY, [0, contentHeight], [0, -contentHeight]);
  const physics = { damping: 15, mass: 0.27, stiffness: 55 }; // Buttery smooth spring
  const spring = useSpring(transform, physics);

  return (
    <>
      {/* Ghost div to create native scrollbar height */}
      <div style={{ height: contentHeight }} />
      
      {/* Fixed content wrapper that moves inversely to scroll */}
      <motion.div
        ref={contentRef}
        style={{ y: spring }}
        className="fixed top-0 left-0 w-full w-screen will-change-transform"
      >
        {children}
      </motion.div>
    </>
  );
};

export default SmoothScroll;
