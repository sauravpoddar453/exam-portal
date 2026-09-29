import React, { useState, useEffect } from 'react';

/**
 * Animated counter that smoothly counts up from 0 to `value`
 */
export default function AnimatedCounter({ value, duration = 1000, suffix = '', prefix = '' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const numericValue = typeof value === 'number' ? value : parseInt(String(value).replace(/,/g, ''), 10);

    if (isNaN(numericValue)) {
      setCount(value);
      return;
    }

    let start = 0;
    const steps = 30;
    const stepDuration = duration / steps;
    const increment = numericValue / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= numericValue) {
        setCount(numericValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, duration]);

  const formatted = typeof count === 'number' ? count.toLocaleString() : count;

  return <span>{prefix}{formatted}{suffix}</span>;
}
