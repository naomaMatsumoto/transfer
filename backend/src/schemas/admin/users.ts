import { z } from "zod";

const nullableStr = z.string().nullable().optional();

export const createUserSchema = z.object({
  name: z.string().min(1, "名前を入力してください"),
  furigana: nullableStr,
  email: z.string().email("有効なメールアドレスを入力してください").nullable().optional(),
  password: z.string().nullable().optional(),
  address: nullableStr,
  phone: nullableStr,
  course_type: nullableStr,
  stage: z.string().optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1, "名前を入力してください").optional(),
    furigana: nullableStr,
    email: z.string().email("有効なメールアドレスを入力してください").nullable().optional(),
    password: z.string().nullable().optional(),
    address: nullableStr,
    phone: nullableStr,
    course_type: nullableStr,
    stage: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "更新するフィールドを1つ以上指定してください",
  });
