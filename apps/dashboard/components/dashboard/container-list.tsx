"use client";

import { ContainerCard, type ContainerRecord } from "./container-card";
import { CreateContainerCard } from "./create-container-card";

/**
 * Props for the ContainerList component.
 */
interface ContainerListProps {
  /** Array of container records to display */
  containers: ContainerRecord[];
  /** Set of container IDs currently having actions performed */
  actingIds: Set<string>;
  /** Handler for container actions (start/stop/restart) */
  onAction: (id: string, action: "start" | "stop" | "restart") => Promise<void>;
  /** Handler for initiating container creation */
  onCreateClick: () => void;
}

/**
 * ContainerList - Displays the list of containers with a creation card.
 * 
 * The list always starts with a CreateContainerCard (dotted outline)
 * as the first item, serving as the primary method for adding new
 * containers. Existing containers are displayed below it.
 * 
 * Layout Structure:
 * 1. CreateContainerCard (always first, dotted border)
 * 2. ContainerCard for each existing container
 * 
 * @param props - Component props
 * @param props.containers - Array of container records
 * @param props.actingIds - IDs of containers with in-progress actions
 * @param props.onAction - Handler for container actions
 * @param props.onCreateClick - Handler for opening create dialog
 * 
 * @example
 * ```tsx
 * <ContainerList
 *   containers={containers}
 *   actingIds={acting}
 *   onAction={doAction}
 *   onCreateClick={() => setShowCreateDialog(true)}
 * />
 * ```
 */
export function ContainerList({ 
  containers, 
  actingIds, 
  onAction, 
  onCreateClick 
}: ContainerListProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Creation card - always first in the list with dotted outline */}
      <CreateContainerCard onCreateClick={onCreateClick} />
      
      {/* Existing containers */}
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
