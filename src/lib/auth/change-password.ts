import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

/** Changes a logged-in user's password after verifying their current one —
 *  distinct from the token-based flow in reset-password.ts, which is for a
 *  user who's locked out and isn't authenticated yet. */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: true } | { error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (!user?.password) {
    return { error: "This account doesn't have a password set." };
  }

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    return { error: "Current password is incorrect." };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

  return { success: true };
}
