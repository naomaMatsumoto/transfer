"use client";

import React from "react";
import type { MemberFormData, MemberFormError } from "@/app/lib/useMemberForm";

export type { MemberFormData, MemberFormError } from "@/app/lib/useMemberForm";
export { ConfirmModal } from "@/app/lib/ConfirmModal";

export type Member = {
  id: number;
  name: string;
  furigana: string | null;
  email: string | null;
  address: string | null;
  phone: string | null;
  course_type: string | null;
  stage: string;
  status?: string;
  created_at?: string;
};

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(s: string): boolean {
  return s.length > 0 && s.length <= 255 && EMAIL_REGEX.test(s);
}
export function isMemberEmailError(code: string): boolean {
  return code === "MEMBER_EMAIL_INVALID" || code === "MEMBER_EMAIL_DUPLICATE";
}

export const stageOptions = [
  { value: "preschool", label: "未就学児" },
  { value: "elementary", label: "小学生" },
  { value: "junior_high", label: "中学生" },
  { value: "high_school", label: "高校生" },
  { value: "adult", label: "大人" },
  { value: "other", label: "その他" },
];

// フォームフィールドのハンドラを生成するヘルパー
function useFieldProps(
  form: MemberFormData,
  setForm: React.Dispatch<React.SetStateAction<MemberFormData>>,
  formError: MemberFormError | null,
  setFormError: (v: MemberFormError | null) => void,
) {
  return (key: keyof MemberFormData) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      if (formError?.field === key) setFormError(null);
    },
  });
}

export function AddMemberModal({
  open,
  form,
  setForm,
  formError,
  setFormError,
  onSave,
  onCancel,
}: {
  open: boolean;
  form: MemberFormData;
  setForm: React.Dispatch<React.SetStateAction<MemberFormData>>;
  formError: MemberFormError | null;
  setFormError: (v: MemberFormError | null) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  const field = useFieldProps(form, setForm, formError, setFormError);
  return (
    <div className="modal fade show d-block bg-black bg-opacity-50" style={{ zIndex: 1050 }} onClick={onCancel}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">会員を新規登録</h5>
          </div>
          <div className="modal-body">
            <div className="d-flex flex-column gap-3 mb-0">
              <div className="mb-2">
                <label className="form-label">名前</label>
                <input type="text" className={`form-control ${formError?.field === "name" ? "is-invalid" : ""}`} placeholder="山田 太郎" {...field("name")} />
                {formError?.field === "name" && <div className="invalid-feedback d-block">{formError.message}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">フリガナ（任意）</label>
                <input type="text" className="form-control" placeholder="ヤマダ タロウ" {...field("furigana")} />
              </div>
              <div className="mb-2">
                <label className="form-label">メール（任意）</label>
                <input type="email" className={`form-control ${formError?.field === "email" ? "is-invalid" : ""}`} placeholder="user@example.com" {...field("email")} />
                {formError?.field === "email" && <div className="invalid-feedback d-block">{formError.message}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">ログイン用パスワード（任意）</label>
                <input type="password" className="form-control" placeholder="カレンダー・振替予約で使用" autoComplete="new-password" {...field("password")} />
                <p className="small text-body-secondary mt-1 mb-0">設定すると会員がカレンダーで振替予約できます</p>
              </div>
              <div className="mb-2">
                <label className="form-label">住所（任意）</label>
                <input type="text" className="form-control" placeholder="〇〇市〇〇町1-2-3" {...field("address")} />
              </div>
              <div className="mb-2">
                <label className="form-label">電話番号（任意）</label>
                <input type="tel" className="form-control" placeholder="090-1234-5678" {...field("phone")} />
              </div>
              <div className="mb-2">
                <label className="form-label">コース種別</label>
                <input type="text" className="form-control" placeholder="—" {...field("courseType")} />
              </div>
              <div className="mb-2">
                <label className="form-label">ステータス</label>
                <select className="form-select" {...field("stage")}>
                  {stageOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>キャンセル</button>
            <button type="button" className="btn btn-success" onClick={onSave}>登録</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditMemberModal({
  open,
  editId,
  form,
  setForm,
  formError,
  setFormError,
  onSave,
  onCancel,
}: {
  open: boolean;
  editId: number | null;
  form: MemberFormData;
  setForm: React.Dispatch<React.SetStateAction<MemberFormData>>;
  formError: MemberFormError | null;
  setFormError: (v: MemberFormError | null) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!open || !editId) return null;
  const field = useFieldProps(form, setForm, formError, setFormError);
  return (
    <div className="modal fade show d-block bg-black bg-opacity-50" style={{ zIndex: 1050 }} onClick={onCancel}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">会員を編集（#{editId}）</h5>
          </div>
          <div className="modal-body">
            <div className="d-flex flex-column gap-0 mb-0">
              <div className="mb-2">
                <label className="form-label">名前</label>
                <input type="text" className={`form-control ${formError?.field === "name" ? "is-invalid" : ""}`} placeholder="山田 太郎" {...field("name")} />
                {formError?.field === "name" && <div className="invalid-feedback d-block">{formError.message}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">フリガナ（任意）</label>
                <input type="text" className="form-control" placeholder="ヤマダ タロウ" {...field("furigana")} />
              </div>
              <div className="mb-2">
                <label className="form-label">メール（任意）</label>
                <input type="email" className={`form-control ${formError?.field === "email" ? "is-invalid" : ""}`} placeholder="user@example.com" {...field("email")} />
                {formError?.field === "email" && <div className="invalid-feedback d-block">{formError.message}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">ログイン用パスワード（変更時のみ）</label>
                <input type="password" className="form-control" placeholder="空欄のままなら変更しません" autoComplete="new-password" {...field("password")} />
              </div>
              <div className="mb-2">
                <label className="form-label">住所（任意）</label>
                <input type="text" className="form-control" placeholder="〇〇市〇〇町1-2-3" {...field("address")} />
              </div>
              <div className="mb-2">
                <label className="form-label">電話番号（任意）</label>
                <input type="tel" className="form-control" placeholder="090-1234-5678" {...field("phone")} />
              </div>
              <div className="mb-2">
                <label className="form-label">コース種別</label>
                <input type="text" className="form-control" placeholder="—" {...field("courseType")} />
              </div>
              <div className="mb-2">
                <label className="form-label">ステータス</label>
                <select className="form-select" {...field("stage")}>
                  {stageOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>キャンセル</button>
            <button type="button" className="btn btn-success" onClick={onSave}>保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}
