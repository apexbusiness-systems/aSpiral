import { useState, useRef, ReactNode } from "react";
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface SwipeHandlerProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  threshold?: number;
  className?: string;
}

export function SwipeHandler({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  threshold = 100,
  className,
}: SwipeHandlerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);

  // Transform x position to opacity for action reveals
  const leftOpacity = useTransform(x, [0, threshold], [0, 1]);
  const rightOpacity = useTransform(x, [-threshold, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    
    if (info.offset.x > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (info.offset.x < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
  };

  return (
    <div ref={constraintsRef} className={cn("relative overflow-hidden", className)}>
      {/* Left action background */}
      {rightAction && (
        <motion.div
          style={{ opacity: leftOpacity }}
          className="absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-primary/20 text-primary"
        >
          {rightAction}
        </motion.div>
      )}

      {/* Right action background */}
      {leftAction && (
        <motion.div
          style={{ opacity: rightOpacity }}
          className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-destructive/20 text-destructive"
        >
          {leftAction}
        </motion.div>
      )}

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={constraintsRef}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn("touch-pan-y", isDragging && "cursor-grabbing")}
      >
        {children}
      </motion.div>
    </div>
  );
}
