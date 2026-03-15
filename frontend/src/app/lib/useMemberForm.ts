"use client";

import { useState, useCallback } from "react";

export type MemberFormData = {
  name: string;
  furigana: string;
  email: string;
  password: string;
  address: string;
  phone: string;
  courseType: string;
  stage: string;
};

export type MemberFormError = { field: string; message: string };

export const MEMBER_FORM_INITIAL: MemberFormData = {
  name: "",
  furigana: "",
  email: "",
  password: "",
  address: "",
  phone: "",
  courseType: "",
  stage: "other",
};

export function useMemberForm() {
  const [form, setForm] = useState<MemberFormData>(MEMBER_FORM_INITIAL);
  const reset = useCallback(() => setForm(MEMBER_FORM_INITIAL), []);
  return { form, setForm, reset };
}
