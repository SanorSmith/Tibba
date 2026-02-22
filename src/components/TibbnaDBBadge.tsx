// Reusable badge component to show Tibbna OpenEHR DB connection status

interface TibbnaDBBadgeProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export default function TibbnaDBBadge({ variant = 'default', className = '' }: TibbnaDBBadgeProps) {
  if (variant === 'compact') {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 ${className}`}>
        🏥 Tibbna OpenEHR DB
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        🏥 Tibbna OpenEHR DB
      </span>
      <span className="text-xs text-gray-400">Connected to OpenEHR-compliant database</span>
    </div>
  );
}
