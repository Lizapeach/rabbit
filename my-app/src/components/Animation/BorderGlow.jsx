import { cloneElement, useCallback } from "react";

const canUseBorderGlow = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
};

function BorderGlow({ children }) {
  const childOnMouseMove = children.props.onMouseMove;
  const childOnMouseLeave = children.props.onMouseLeave;

  const handleMouseMove = useCallback(
    (e) => {
      childOnMouseMove?.(e);

      if (!canUseBorderGlow()) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
      e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
    },
    [childOnMouseMove]
  );

  const handleMouseLeave = useCallback(
    (e) => {
      childOnMouseLeave?.(e);

      e.currentTarget.style.setProperty("--mouse-x", "-999px");
      e.currentTarget.style.setProperty("--mouse-y", "-999px");
    },
    [childOnMouseLeave]
  );

  return cloneElement(children, {
    className: `border-glow ${children.props.className || ""}`.trim(),
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  });
}

export default BorderGlow;
