"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getTokenClaims } from "@/lib/auth";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Profile {
  displayName: string | null;
  pictureUrl: string | null;
  email: string;
}

/** Derives up to two uppercase initials from a display name or email. */
function initials(displayName: string | null, email: string): string {
  const source = displayName ?? email.split("@")[0];
  return source
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const claims = getTokenClaims();
    if (!claims) return;
    setProfile({
      displayName: claims.display_name,
      pictureUrl: claims.picture_url,
      email: claims.email,
    });
  }, []);

  if (!profile) return null;

  const label = profile.displayName ?? profile.email.split("@")[0];

  return (
    <motion.div
      className="fixed right-5 top-4 z-50 flex items-center gap-2.5"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
    >
      {/* Circular avatar with foreground-coloured ring */}
      <div className="relative size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/25">
        {profile.pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.pictureUrl}
            alt={label}
            className="size-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex size-full items-center justify-center bg-muted text-[10px] font-medium text-foreground">
            {initials(profile.displayName, profile.email)}
          </span>
        )}
      </div>

      {/* Display name — hidden on xs so only the avatar shows on very small screens */}
      <span className="hidden text-sm text-foreground sm:inline">{label}</span>
    </motion.div>
  );
}

