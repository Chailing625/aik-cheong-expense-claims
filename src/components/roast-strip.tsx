import { cn } from "@/lib/utils";

/** Four bands, green bean to dark roast. The one signature touch of the app. */
export function RoastStrip({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex h-1.5 w-full overflow-hidden rounded-full", className)}>
      <span className="flex-1 bg-roast-green" />
      <span className="flex-1 bg-roast-light" />
      <span className="flex-1 bg-roast-medium" />
      <span className="flex-1 bg-roast-dark" />
    </div>
  );
}
