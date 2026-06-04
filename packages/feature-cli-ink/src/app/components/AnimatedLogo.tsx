import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';

const GRADIENT_NAMES = [
  'cristal', 'teen', 'mind', 'morning', 'vice', 'passion', 'fruit',
] as const;

type GradientName = typeof GRADIENT_NAMES[number];

interface AnimatedLogoProps {
  text: string;
  /** ms per frame — default 350 */
  interval?: number;
}

/**
 * Cycles through ink-gradient presets to create a flowing colour animation
 * on the BigText logo.
 */
export function AnimatedLogo({ text, interval = 350 }: AnimatedLogoProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % GRADIENT_NAMES.length);
    }, interval);
    return () => clearInterval(id);
  }, [interval]);

  const gradientName = GRADIENT_NAMES[frame] as GradientName;

  return (
    <Gradient name={gradientName}>
      <BigText text={text} font="block" />
    </Gradient>
  );
}
