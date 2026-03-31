import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "メールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export const memberLoginSchema = loginSchema;

export const forgotPasswordSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "トークンが必要です"),
  password: z.string().min(6, "パスワードは6文字以上にしてください"),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
  newPassword: z.string().min(6, "新しいパスワードは6文字以上にしてください"),
});
