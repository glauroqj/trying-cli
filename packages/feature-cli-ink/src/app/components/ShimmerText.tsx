import React, { useEffect, useState } from 'react';
import { Text } from 'ink';

export function ShimmerText({ text }: { text: string }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), 120);
    return () => clearInterval(id);
  }, []);
  const colors = ['gray', 'white', 'cyan', 'white'] as const;
  return <Text color={colors[frame % colors.length]}>{text}</Text>;
}
