import Link from "next/link";
import { Sparkles, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";

const features = [
  {
    icon: Users,
    title: "Real-time collaboration",
    description: "See your team's edits live, on every page, in every workspace.",
  },
  {
    icon: Sparkles,
    title: "AI-assisted writing",
    description: "Elaborate, condense, or polish your content with a click.",
  },
  {
    icon: Zap,
    title: "Built for teams",
    description: "Departments as workspaces, pages nested infinitely, all in sync.",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl dark:text-white">
          One workspace for your whole organization
        </h1>
        <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
          Docs, real-time collaboration, and an AI assistant that actually knows your workspace.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/register">
            <Button>Get started for free</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">Log in</Button>
          </Link>
        </div>
      </div>

      <div className="mt-24 grid gap-8 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-800"
          >
            <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h3 className="mt-4 font-semibold text-neutral-900 dark:text-white">{title}</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
