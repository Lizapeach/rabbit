import { useRef, useState, useCallback } from "react";
import { motion, useInView } from "motion/react";

function AnimatedScrollItem({ children, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, {
    amount: 0.35,
    once: false,
  });

  return (
    <motion.div
      ref={ref}
      data-index={index}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.96, opacity: 0 }}
      transition={{ duration: 0.24, delay: 0.03 }}
      className="animated-scroll-list__item"
    >
      {children}
    </motion.div>
  );
}

function AnimatedScrollList({
  children,
  className = "",
  showGradients = true,
  displayScrollbar = true,
}) {
  const listRef = useRef(null);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(0);

  const handleScroll = useCallback((event) => {
    const { scrollTop, scrollHeight, clientHeight } = event.target;

    setTopGradientOpacity(Math.min(scrollTop / 50, 1));

    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1)
    );
  }, []);

  const items = Array.isArray(children) ? children : [children];

  return (
    <div className="animated-scroll-list">
      <div
        ref={listRef}
        className={`${className} ${!displayScrollbar ? "no-scrollbar" : ""}`}
        onScroll={handleScroll}
      >
        {items.map((child, index) => (
          <AnimatedScrollItem key={index} index={index}>
            {child}
          </AnimatedScrollItem>
        ))}
      </div>

      {showGradients && (
        <>
          <div
            className="animated-scroll-list__gradient animated-scroll-list__gradient--top"
            style={{ opacity: topGradientOpacity }}
          />
          <div
            className="animated-scroll-list__gradient animated-scroll-list__gradient--bottom"
            style={{ opacity: bottomGradientOpacity }}
          />
        </>
      )}
    </div>
  );
}

export default AnimatedScrollList;