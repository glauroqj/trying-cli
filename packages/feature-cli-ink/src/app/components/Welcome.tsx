import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { getWelcomeContent } from '@trying-cli/agents-core';
import { AnimatedLogo } from './AnimatedLogo.js';

interface WelcomeProps {
  onContinue: () => void;
}

export function Welcome({ onContinue }: WelcomeProps) {
  const welcome = getWelcomeContent();
  const [showSub, setShowSub] = useState(false);
  const [blink, setBlink] = useState(true);

  // Reveal subtitle after a short delay
  useEffect(() => {
    const id = setTimeout(() => setShowSub(true), 500);
    return () => clearTimeout(id);
  }, []);

  // Blink the "press any key" hint
  useEffect(() => {
    if (!showSub) return;
    const id = setInterval(() => setBlink((b) => !b), 600);
    return () => clearInterval(id);
  }, [showSub]);

  // Any key triggers onContinue
  useInput(() => {
    onContinue();
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      <AnimatedLogo text={welcome.brandName} />
      <Box gap={2}>
        <Text color="cyan">{welcome.tagline}</Text>
        <Text dimColor>v{welcome.version}</Text>
      </Box>
      <Box marginTop={1}>
        {showSub ? (
          <Text color={blink ? 'yellow' : 'gray'}>{welcome.subtitle}</Text>
        ) : (
          <Text> </Text>
        )}
      </Box>
    </Box>
  );
}
