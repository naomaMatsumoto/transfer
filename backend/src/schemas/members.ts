import { z } from "zod";

export const registerMemberSchema = z.object({
  storeId: z.number().int().positive("有効な店舗IDを指定してください"),
  name: z.string().min(1, "名前を入力してください"),
  furigana: z.string().optional(),
  email: z.string().email("有効なメールアドレスを入力してください"),
  phone: z.string().optional(),
});
