import { cn } from "@/lib/utils";
import { STATUS_LABEL, type Status } from "@/lib/data";

const styles: Record<Status, string> = {
  pending: "bg-yellow-100 text-yellow-800 ring-yellow-300",
  approved: "bg-green-100 text-green-800 ring-green-300",
  rejected: "bg-red-100 text-red-700 ring-red-300",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", styles[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}
