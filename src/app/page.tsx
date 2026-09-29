import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/service";
import { ROLE_HOME } from "@/lib/navigation";

export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? ROLE_HOME[user.role] : "/login");
}
