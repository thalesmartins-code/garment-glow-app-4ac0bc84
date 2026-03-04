import { useEffect, useState, useRef } from "react";

interface UseCountAnimationOptions {
  duration?: number;
  delay?: number;
  easing?: (t: number) => number;
}

// Gentle ease-out for a smooth, natural feel
const easeOutSine = (t: number): number => Math.sin((t * Math.PI) / 2);

export function useCountAnimation(
  endValue: number,
  options: UseCountAnimationOptions = {}
): number {
  const { duration = 800, delay = 0, easing = easeOutSine } = options;
  const [currentValue, setCurrentValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset when endValue changes
    setCurrentValue(0);
    startTimeRef.current = null;

    const startAnimation = () => {
      const animate = (timestamp: number) => {
        if (startTimeRef.current === null) {
          startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(progress);
        
        setCurrentValue(endValue * easedProgress);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    };

    const timeoutId = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timeoutId);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [endValue, duration, delay, easing]);

  return currentValue;
}

// Hook for animating formatted currency values
export function useAnimatedCurrency(
  value: number,
  options: UseCountAnimationOptions = {}
): string {
  const animatedValue = useCountAnimation(value, options);
  
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(animatedValue);
}

// Hook for animating formatted numbers
export function useAnimatedNumber(
  value: number,
  options: UseCountAnimationOptions & { decimals?: number } = {}
): string {
  const { decimals = 0, ...animationOptions } = options;
  const animatedValue = useCountAnimation(value, animationOptions);
  
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(animatedValue);
}

// Hook for animating percentage values
export function useAnimatedPercentage(
  value: number,
  options: UseCountAnimationOptions & { decimals?: number } = {}
): string {
  const { decimals = 1, ...animationOptions } = options;
  const animatedValue = useCountAnimation(value, animationOptions);
  
  return `${animatedValue.toFixed(decimals)}%`;
}
