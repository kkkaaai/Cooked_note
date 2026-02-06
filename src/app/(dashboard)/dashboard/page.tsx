import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DocumentList } from "@/components/pdf/DocumentList";

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const firstName = user.firstName || "there";

  return <DocumentList userName={firstName} />;
}
