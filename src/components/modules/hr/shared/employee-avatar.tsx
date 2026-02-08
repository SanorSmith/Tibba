'use client';

interface EmployeeAvatarProps {
  name: string;
  photo_url?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-16 h-16', text: 'text-lg' },
};

export function EmployeeAvatar({ name, photo_url, size = 'md' }: EmployeeAvatarProps) {
  const s = sizeMap[size];
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (photo_url) {
    return (
      <img
        src={photo_url}
        alt={name}
        className={`${s.container} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${s.container} ${s.text} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: '#618FF5' }}
    >
      {initials}
    </div>
  );
}
