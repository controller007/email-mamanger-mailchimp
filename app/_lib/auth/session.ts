import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "./handler"
import { revalidatePath } from "next/cache"

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

export async function requireAuth() {
  const session = await getSession()
  if (!session?.user) {
    redirect("/login")
  }
  revalidatePath("/")
  return session.user
}
