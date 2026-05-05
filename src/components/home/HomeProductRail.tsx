import { cn } from "@/lib/utils";

/** Mobilde yatay kaydırma + snap; sm ve üzeri normal grid. */
export function HomeProductRail({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-visible px-4 pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:grid sm:snap-none sm:gap-8 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function HomeProductRailItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[min(82vw,17.5rem)] shrink-0 snap-center sm:w-auto sm:min-w-0">
      {children}
    </div>
  );
}
