import React from "react";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  planning: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  on_hold: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  draft: "bg-gray-100 text-gray-700",
  final: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  sent: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
  partially_paid: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-800",
  sent_for_approval: "bg-purple-100 text-purple-800",
  issued: "bg-teal-100 text-teal-800",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const color = statusColors[status] || "bg-gray-100 text-gray-800";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color} ${className}`}
    >
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
}
