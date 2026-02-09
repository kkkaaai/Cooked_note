import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { FileText, MessageSquare } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold">GoodNotes Clone</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Documents
              </Link>
              <Link
                href="/dashboard/conversations"
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Conversations
              </Link>
            </nav>
            {/* Mobile nav */}
            <nav className="flex sm:hidden items-center gap-2">
              <Link
                href="/dashboard"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Docs
              </Link>
              <Link
                href="/dashboard/conversations"
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <MessageSquare className="h-3 w-3" />
                Chats
              </Link>
            </nav>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
