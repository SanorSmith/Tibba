'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function IdleTimer() {
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [warning, setWarning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          return 600; // Reset to 10 minutes
        }
        
        const newTime = prev - 1;
        setWarning(newTime <= 60); // Show warning when less than 1 minute
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-gray-500" />
      <Badge 
        variant={warning ? "error" : "secondary"}
        className="text-xs"
      >
        {warning && <AlertCircle className="w-3 h-3 mr-1" />}
        {minutes}:{seconds.toString().padStart(2, '0')}
      </Badge>
    </div>
  );
}
