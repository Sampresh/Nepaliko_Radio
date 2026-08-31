import { animate, motion, useMotionValue } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import useMeasure from 'react-use-measure';

import { cn } from '@/lib/utils';

/**
 * Marquee that scrolls its children forever. The children are rendered twice
 * and the track is translated by exactly half its measured size, so the seam
 * lands where the copies line up and the loop reads as continuous.
 *
 * `speed` is px/second, not a duration, so rows of differing width scroll at
 * the same visual pace.
 */
export type InfiniteSliderProps = {
  children: ReactNode;
  /** Space between items, in px. Also counted into the wrap distance. */
  gap?: number;
  /** Scroll rate in px/second. */
  speed?: number;
  /** Scroll rate while hovered, in px/second. Omit to disable hover response. */
  speedOnHover?: number;
  direction?: 'horizontal' | 'vertical';
  /** Scroll towards the start instead of the end. */
  reverse?: boolean;
  className?: string;
};

export function InfiniteSlider({
  children,
  gap = 16,
  speed = 100,
  speedOnHover,
  direction = 'horizontal',
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const [currentSpeed, setCurrentSpeed] = useState(speed);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [key, setKey] = useState(0);
  const [ref, { width, height }] = useMeasure();
  const translation = useMotionValue(0);

  useEffect(() => {
    const size = direction === 'horizontal' ? width : height;
    const contentSize = size + gap;
    const from = reverse ? -contentSize / 2 : 0;
    const to = reverse ? 0 : -contentSize / 2;

    // A speed change mid-scroll can't just restart the loop — that would snap
    // the track back to `from`. Instead ease out the remaining distance at the
    // new speed, then bump `key` to re-enter the loop below at a clean phase.
    if (isTransitioning) {
      const remaining = Math.abs(translation.get() - to);
      const controls = animate(translation, [translation.get(), to], {
        ease: 'linear',
        duration: remaining / currentSpeed,
        onComplete: () => {
          setIsTransitioning(false);
          setKey((prev) => prev + 1);
        },
      });
      return controls.stop;
    }

    const controls = animate(translation, [from, to], {
      ease: 'linear',
      duration: Math.abs(to - from) / currentSpeed,
      repeat: Infinity,
      repeatType: 'loop',
      repeatDelay: 0,
      onRepeat: () => {
        translation.set(from);
      },
    });
    return controls.stop;
  }, [key, translation, currentSpeed, width, height, gap, isTransitioning, direction, reverse]);

  const hoverProps = speedOnHover
    ? {
        onHoverStart: () => {
          setIsTransitioning(true);
          setCurrentSpeed(speedOnHover);
        },
        onHoverEnd: () => {
          setIsTransitioning(true);
          setCurrentSpeed(speed);
        },
      }
    : {};

  return (
    <div className={cn('overflow-hidden', className)}>
      <motion.div
        ref={ref}
        className="flex w-max"
        style={{
          ...(direction === 'horizontal' ? { x: translation } : { y: translation }),
          gap: `${gap}px`,
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
        }}
        {...hoverProps}>
        {children}
        {children}
      </motion.div>
    </div>
  );
}
