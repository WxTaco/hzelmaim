"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PasswordBannerProps {
  password: string;
  onDismiss: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function PasswordBanner({ password, onDismiss }: PasswordBannerProps) {
  const [copied, setCopied] = useState(false);

  const copyPassword = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
      animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="overflow-hidden"
    >
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent ring-1 ring-amber-500/30 px-4 py-4">
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
        
        <div className="relative flex items-start gap-3">
          <div className="flex items-center justify-center size-8 rounded-lg bg-amber-500/20 shrink-0">
            <KeyRound className="size-4 text-amber-500" />
          </div>
          
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Save your root password
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This password won&apos;t be shown again. Make sure to save it somewhere safe.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 bg-background/50 border border-amber-500/20 rounded-lg px-3 py-2 font-mono text-sm break-all">
                {password}
              </code>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyPassword}
                className="shrink-0 gap-2 border-amber-500/30 hover:bg-amber-500/10"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={onDismiss} 
            title="Dismiss"
            className="shrink-0 hover:bg-amber-500/10"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
