import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function AnimatedContent({
  children,
  container,
  distance = 80,
  direction = "vertical",
  reverse = false,
  duration = 0.8,
  ease = "power3.out",
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.1,
  delay = 0,
  className = "",
  ...props
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let scrollerTarget =
      container || document.getElementById("snap-main-container") || null;

    if (typeof scrollerTarget === "string") {
      scrollerTarget = document.querySelector(scrollerTarget);
    }

    const axis = direction === "horizontal" ? "x" : "y";
    const offset = reverse ? -distance : distance;
    const startPct = (1 - threshold) * 100;

    gsap.set(el, {
      [axis]: offset,
      scale,
      opacity: animateOpacity ? initialOpacity : 1,
      visibility: "visible",
    });

    const tl = gsap.timeline({
      paused: true,
      delay,
    });

    tl.to(el, {
      [axis]: 0,
      scale: 1,
      opacity: 1,
      duration,
      ease,
    });

    const scrollTriggerConfig = {
      trigger: el,
      start: `top ${startPct}%`,
      once: true,
      onEnter: () => tl.play(),
    };

    if (scrollerTarget) {
      scrollTriggerConfig.scroller = scrollerTarget;
    }

    const st = ScrollTrigger.create(scrollTriggerConfig);

    return () => {
      st.kill();
      tl.kill();
    };
  }, [
    container,
    distance,
    direction,
    reverse,
    duration,
    ease,
    initialOpacity,
    animateOpacity,
    scale,
    threshold,
    delay,
  ]);

  return (
    <div ref={ref} className={className} style={{ visibility: "hidden" }} {...props}>
      {children}
    </div>
  );
}

export default AnimatedContent;

