"use client";

import React from "react";
import { motion } from "framer-motion";
import { Activity, FileSearch, ShieldCheck } from "lucide-react";

import type { AuthUser } from "../lib/api";
import { staggerContainer, staggerItem } from "../lib/motion";
import { useStore } from "../lib/store";
import AuthForm from "./AuthForm";

const features = [
  {
    icon: <FileSearch size={15} />,
    title: "Cited answers",
    description: "Every response links to the document chunks it was assembled from.",
  },
  {
    icon: <ShieldCheck size={15} />,
    title: "Scoped data",
    description: "Uploads and conversations stay tied to your authenticated account.",
  },
  {
    icon: <Activity size={15} />,
    title: "Live ingestion",
    description: "Worker jobs report stage-by-stage progress for each document.",
  },
];

/**
 * Auth gate UI for the /login page. Left panel is the product evidence
 * console; right panel is the shared AuthForm card, which reports success
 * here — this component only dispatches SET_CURRENT_USER and nothing else
 * (the /login gate handles the setup flag and redirect).
 */
export default function AuthScreen() {
  const { dispatch } = useStore();

  const handleAuthenticated = React.useCallback(
    (user: AuthUser) => {
      dispatch({ type: "SET_CURRENT_USER", payload: user });
    },
    [dispatch],
  );

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: "var(--bg-primary)" }}
    >
      <motion.div
        className="grid w-full max-w-4xl items-stretch gap-4 lg:grid-cols-2"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Evidence console */}
        <motion.section
          variants={staggerItem}
          className="relative overflow-hidden rounded-xl"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <div
            aria-hidden="true"
            className="panel-grid pointer-events-none absolute inset-0"
            style={{ opacity: 0.5 }}
          />
          <div className="relative flex h-full flex-col p-6 sm:p-8">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              Sourceful
            </p>
            <h1
              className="display mt-4 text-2xl font-semibold leading-snug"
              style={{ color: "var(--text-primary)" }}
            >
              Traceable document QA.
            </h1>
            <p
              className="mt-3 max-w-sm text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Sign in to ask questions across your library — every answer carries the
              evidence it was built from.
            </p>

            <div className="mt-auto flex flex-col pt-8">
              {features.map((feature) => (
                <FeatureRow
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              ))}
            </div>
          </div>
        </motion.section>

        {/* Auth console */}
        <motion.div variants={staggerItem} className="flex">
          <div className="w-full">
            <AuthForm onAuthenticated={handleAuthenticated} />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="flex items-start gap-3 border-t py-3.5"
      style={{ borderColor: "var(--border)" }}
    >
      <span
        className="inline-flex shrink-0 rounded-md p-1.5"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          color: "var(--accent-secondary)",
        }}
      >
        {icon}
      </span>
      <div>
        <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
          {title}
        </p>
        <p
          className="mt-0.5 text-xs leading-relaxed"
          style={{ color: "var(--text-tertiary)" }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
