"use client";

import { motion } from "framer-motion";

export default function DashboardPage() {
  return (
    <motion.div
      className="flex min-h-screen items-center justify-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="text-sm text-muted-foreground">Dashboard — coming soon</p>
    </motion.div>
  );
}

