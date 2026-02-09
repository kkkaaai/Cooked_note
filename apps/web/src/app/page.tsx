import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Highlighter, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">GoodNotes Clone</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center">
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            AI-Enhanced PDF Annotator
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Upload PDFs, highlight text, and get instant AI-powered explanations.
            Learn faster with context-aware insights from Claude.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/sign-up">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>

          <div className="mx-auto mt-20 grid max-w-3xl gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Upload PDFs</h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop your documents for instant viewing
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Highlighter className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Highlight Text</h3>
              <p className="text-sm text-muted-foreground">
                Select and annotate with multiple colors
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">AI Explanations</h3>
              <p className="text-sm text-muted-foreground">
                Get instant, context-aware insights from Claude
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Built with Next.js, Clerk, and Claude AI
      </footer>
    </div>
  );
}
