"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface InteractiveButtonProps {
  label?: string;
  className?: string;
}

export const InteractiveButton: React.FC<InteractiveButtonProps> = ({
  label = 'Clicked 0 times',
  className,
}) => {
  const [count, setCount] = useState(0);

  return (
    <Button
      onClick={() => setCount(count + 1)}
      className={className}
      variant="default"
    >
      {label.replace('0', count.toString())}
    </Button>
  );
};

