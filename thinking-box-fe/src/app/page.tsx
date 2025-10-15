import { AIInput } from "@/components/ai-input"
import { Codesandbox } from 'lucide-react';

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-clip">
      {/* animated background */}
      <div className="animated-gradient absolute inset-0 -z-10" aria-hidden="true" />


      <section className="relative mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 pb-24 pt-32 text-center md:pt-44">
        <span className=" flex rounded-full justify-between gap-2 items-center bg-secondary/40 px-2 py-1 text-sm text-secondary-foreground/80 ring-1 ring-border/40">
        <Codesandbox className="w-4 h-4"/>
          thinking-box
        </span>

        <h1 className="text-balance font-sans text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
          {"Lets build future"}
        </h1>

        <p className="text-pretty max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Compose interfaces at the speed of thought. Ship confidently with a beautiful developer-first experience and
          an AI-native workflow.
        </p>

        <AIInput />
      </section>
    </main>
  )
}
