"use client";

import { useParams } from "next/navigation";
import { WebTerminal } from "@/components/dashboard/web-terminal";

/**
 * Standalone terminal page — rendered when the terminal is popped out into its
 * own browser window via the pop-out button on the container detail page.
 *
 * Bypasses the dashboard layout (no sidebar / top header) so the terminal
 * fills the entire viewport cleanly.
 */
export default function StandaloneTerminalPage() {
  const { id } = useParams() as { id: string };

  return (
    <div className="h-screen w-screen bg-[#09090b] overflow-hidden">
      <WebTerminal containerId={id} />
    </div>
  );
}

