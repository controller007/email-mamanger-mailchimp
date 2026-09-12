import { getSession } from "@/app/_lib/auth/session"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const session = await getSession()

  if (session?.user) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
