import prisma from "./prisma"
import type { User } from "@prisma/client"

export async function GetUserByEmail(email: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    })
    return user
  } catch (error) {
    console.error("Error fetching user by email:", error)
    return null
  }
}

export async function CreateUser(userData: {
  email: string
  password: string
  firstName?: string
  lastName?: string
  username?: string
}): Promise<User> {
  return await prisma.user.create({
    data: userData,
  })
}

// export async function GetAdmins(): Promise<User[]> {
//   return await prisma.user.findMany({
//     where: {
//       admin: true,
//     },
//   })
// }
