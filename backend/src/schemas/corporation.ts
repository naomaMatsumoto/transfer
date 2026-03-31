import { z } from "zod";

export const registerCorporationSchema = z.object({
  organizationType: z.enum(["corporation", "sole_proprietor"]).optional(),
  corporationName: z.string().min(1, "法人名を入力してください"),
  storeName: z.string().min(1, "店舗名を入力してください"),
  adminEmail: z.string().email("有効なメールアドレスを入力してください"),
  adminPassword: z.string().min(6, "パスワードは6文字以上にしてください"),
  adminDisplayName: z.string().optional(),
});
