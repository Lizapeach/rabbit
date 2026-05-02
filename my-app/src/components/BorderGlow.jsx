import { useCallback, cloneElement } from "react";

function BorderGlow({ children }) {
  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);

  const handleMouseLeave = useCallback((e) => {
    e.currentTarget.style.setProperty("--mouse-x", "-999px");
    e.currentTarget.style.setProperty("--mouse-y", "-999px");
  }, []);

  return cloneElement(children, {
    className: `border-glow ${children.props.className || ""}`.trim(),
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  });
}

export default BorderGlow;