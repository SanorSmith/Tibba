export default function LimsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden text-[#2B2D2F]">
      {children}
    </div>
  );
}
