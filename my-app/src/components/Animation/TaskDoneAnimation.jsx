import { motion } from "motion/react";

const getPathAnimate = (isChecked) => ({
  pathLength: isChecked ? 1 : 0,
  opacity: isChecked ? 1 : 0,
});

const getPathTransition = (isChecked) => ({
  pathLength: { duration: 0.7, ease: "easeInOut" },
  opacity: {
    duration: 0.01,
    delay: isChecked ? 0 : 0.7,
  },
});

function TaskDoneAnimation({ children, done, variant = "default" }) {
  return (
    <span className={`task-text-strike task-text-strike--${variant}`}>
      <span className="task-text-strike__label">{children}</span>

      <motion.svg
        width="360"
        height="34"
        viewBox="0 0 360 34"
        className="task-text-strike__line"
        aria-hidden="true"
      >
        <motion.path
          d="M 8 17.5 s 74 -10.8 91 -10.7 c 23 0.1 -42 13.8 -27 21.1 c 13.4 6.6 129 -27.1 139 -16.6 c 8.1 8.5 -27.5 19.4 5.1 21.1 c 27 1.4 136 -20.4 136 -20.4"
          vectorEffect="non-scaling-stroke"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeMiterlimit="10"
          fill="none"
          initial={false}
          animate={getPathAnimate(Boolean(done))}
          transition={getPathTransition(Boolean(done))}
        />
      </motion.svg>
    </span>
  );
}

function AnimatedCheckMark({ visible, className = "" }) {
  if (!visible) return null;

  return (
    <motion.span
      className={`task-checkmark ${className}`.trim()}
      initial={{ scale: 0, rotate: -35, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 22 }}
    >
      ✓
    </motion.span>
  );
}

export { TaskDoneAnimation, AnimatedCheckMark };
