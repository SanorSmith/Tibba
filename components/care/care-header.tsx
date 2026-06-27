import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

interface CareHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function CareHeader({ title, description, action }: CareHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      <Separator />
    </div>
  );
}
