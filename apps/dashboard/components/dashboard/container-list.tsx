"use client";

import { ContainerCard, type ContainerRecord } from "./container-card";
import { EmptyState } from "./empty-state";

interface ContainerListProps {
  containers: ContainerRecord[];
  actingIds: Set<string>;
  onAction: (id: string, action: "start" | "stop" | "restart") => Promise<void>;
  onCreateClick: () => void;
}

export function ContainerList({ containers, actingIds, onAction, onCreateClick }: ContainerListProps) {
  if (containers.length === 0) {
    return <EmptyState onCreateClick={onCreateClick} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {containers.map((container, i) => (
        <ContainerCard
          key={container.id}
          container={container}
          index={i}
          busy={actingIds.has(container.id)}
          onAction={onAction}
        />
      ))}
    </div>
  );
}
