"use server"

import prisma from "@/app/_lib/db/prisma"
import { requireAuth } from "@/app/_lib/auth/session"
import { revalidatePath } from "next/cache"


export async function deleteEmailHistory(id: string) {
  const user = await requireAuth()

  await prisma.$transaction(async (tx) => {
    await tx.emailRecipientEvent.deleteMany({
      where: { emailHistoryId: id },
    })
    await tx.emailHistory.delete({
      where: { id, userId: user.id },
    })
  })

  revalidatePath("/")
}

export async function deleteManyEmailHistories(ids: string[]) {
  const user = await requireAuth()

  await prisma.$transaction(async (tx) => {
    await tx.emailRecipientEvent.deleteMany({
      where: { emailHistoryId: { in: ids } },
    })
    await tx.emailHistory.deleteMany({
      where: { id: { in: ids }, userId: user.id },
    })
  })

  revalidatePath("/")
}

export async function clearAllEmailHistories() {
  const user = await requireAuth()

  await prisma.$transaction(async (tx) => {
    await tx.emailRecipientEvent.deleteMany({
      where: {
        emailHistory: { userId: user.id },
      },
    })
    await tx.emailHistory.deleteMany({
      where: { userId: user.id },
    })
  })

  revalidatePath("/")
}
