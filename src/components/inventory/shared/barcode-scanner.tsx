'use client';

import { useState } from 'react';
import { Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  label?: string;
  className?: string;
}

export function BarcodeScanner({ onScan, label = "Scan Barcode", className }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      const mockBarcode = `BARCODE-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      onScan(mockBarcode);
      setScanning(false);
    }, 1500);
  };

  return (
    <Button
      onClick={handleScan}
      disabled={scanning}
      className={cn("flex items-center gap-2", className)}
      variant="outline"
    >
      <Scan className={cn("w-4 h-4", scanning && "animate-pulse")} />
      {scanning ? 'Scanning...' : label}
    </Button>
  );
}
