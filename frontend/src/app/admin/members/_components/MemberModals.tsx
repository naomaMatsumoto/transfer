"use client";

import React from "react";

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

export function ConfirmModal({
  open,
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = "実行",
  confirmColor = "#3b82f6",
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmColor?: string;
}) {
  if (!open) return null;
  return (
    <div className="modal fade show d-block bg-black bg-opacity-50" style={{ zIndex: 1050 }} onClick={onCancel}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
          </div>
          <div className="modal-body">{children}</div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              キャンセル
            </button>
            <button
              type="button"
              className={confirmColor === "#991b1b" ? "btn btn-danger" : "btn btn-primary"}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const stageOptions = [
  { value: "preschool", label: "未就学児" },
  { value: "elementary", label: "小学生" },
  { value: "junior_high", label: "中学生" },
  { value: "high_school", label: "高校生" },
  { value: "adult", label: "大人" },
  { value: "other", label: "その他" },
];

export function AddMemberModal({
  open,
  name,
  setName,
  furigana,
  setFurigana,
  email,
  setEmail,
  password,
  setPassword,
  address,
  setAddress,
  phone,
  setPhone,
  courseType,
  setCourseType,
  stage,
  setStage,
  formError,
  setFormError,
  onSave,
  onCancel,
}: {
  open: boolean;
  name: string;
  setName: (v: string) => void;
  furigana: string;
  setFurigana: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  courseType: string;
  setCourseType: (v: string) => void;
  stage: string;
  setStage: (v: string) => void;
  formError: { field: string; message: string } | null;
  setFormError: (v: { field: string; message: string } | null) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
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
            <input
              type="text"
              className={`form-control ${formError?.field === "name" ? "is-invalid" : ""}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formError?.field === "name") setFormError(null);
              }}
              placeholder="山田 太郎"
            />
            {formError?.field === "name" && <div className="invalid-feedback d-block">{formError.message}</div>}
          </div>
          <div className="mb-2">
            <label className="form-label">フリガナ（任意）</label>
            <input type="text" className="form-control" value={furigana} onChange={(e) => setFurigana(e.target.value)} placeholder="ヤマダ タロウ" />
          </div>
          <div className="mb-2">
            <label className="form-label">メール（任意）</label>
            <input type="email" className={`form-control ${formError?.field === "email" ? "is-invalid" : ""}`} value={email} onChange={(e) => { setEmail(e.target.value); if (formError?.field === "email") setFormError(null); }} placeholder="user@example.com" />
            {formError?.field === "email" && <div className="invalid-feedback d-block">{formError.message}</div>}
          </div>
          <div className="mb-2">
            <label className="form-label">ログイン用パスワード（任意）</label>
            <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="カレンダー・振替予約で使用" autoComplete="new-password" />
            <p className="small text-body-secondary mt-1 mb-0">設定すると会員がカレンダーで振替予約できます</p>
          </div>
          <div className="mb-2">
            <label className="form-label">住所（任意）</label>
            <input type="text" className="form-control" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="〇〇市〇〇町1-2-3" />
          </div>
          <div className="mb-2">
            <label className="form-label">電話番号（任意）</label>
            <input type="tel" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="090-1234-5678" />
          </div>
          <div className="mb-2">
            <label className="form-label">コース種別</label>
            <input type="text" className="form-control" value={courseType} onChange={(e) => setCourseType(e.target.value)} placeholder="—" />
          </div>
          <div className="mb-2">
            <label className="form-label">ステータス</label>
            <select className="form-select" value={stage} onChange={(e) => setStage(e.target.value)}>
              {stageOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
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
  name,
  setName,
  furigana,
  setFurigana,
  email,
  setEmail,
  password,
  setPassword,
  address,
  setAddress,
  phone,
  setPhone,
  courseType,
  setCourseType,
  stage,
  setStage,
  formError,
  setFormError,
  onSave,
  onCancel,
}: {
  open: boolean;
  editId: number | null;
  name: string;
  setName: (v: string) => void;
  furigana: string;
  setFurigana: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  courseType: string;
  setCourseType: (v: string) => void;
  stage: string;
  setStage: (v: string) => void;
  formError: { field: string; message: string } | null;
  setFormError: (v: { field: string; message: string } | null) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!open || !editId) return null;
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
            <input type="text" className={`form-control ${formError?.field === "name" ? "is-invalid" : ""}`} value={name} onChange={(e) => { setName(e.target.value); if (formError?.field === "name") setFormError(null); }} placeholder="山田 太郎" />
            {formError?.field === "name" && <div className="invalid-feedback d-block">{formError.message}</div>}
          </div>
          <div className="mb-2">
            <label className="form-label">フリガナ（任意）</label>
            <input type="text" className="form-control" value={furigana} onChange={(e) => setFurigana(e.target.value)} placeholder="ヤマダ タロウ" />
          </div>
          <div className="mb-2">
            <label className="form-label">メール（任意）</label>
            <input type="email" className={`form-control ${formError?.field === "email" ? "is-invalid" : ""}`} value={email} onChange={(e) => { setEmail(e.target.value); if (formError?.field === "email") setFormError(null); }} placeholder="user@example.com" />
            {formError?.field === "email" && <div className="invalid-feedback d-block">{formError.message}</div>}
          </div>
          <div className="mb-2">
            <label className="form-label">ログイン用パスワード（変更時のみ）</label>
            <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="空欄のままなら変更しません" autoComplete="new-password" />
          </div>
          <div className="mb-2">
            <label className="form-label">住所（任意）</label>
            <input type="text" className="form-control" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="〇〇市〇〇町1-2-3" />
          </div>
          <div className="mb-2">
            <label className="form-label">電話番号（任意）</label>
            <input type="tel" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="090-1234-5678" />
          </div>
          <div className="mb-2">
            <label className="form-label">コース種別</label>
            <input type="text" className="form-control" value={courseType} onChange={(e) => setCourseType(e.target.value)} placeholder="—" />
          </div>
          <div className="mb-2">
            <label className="form-label">ステータス</label>
            <select className="form-select" value={stage} onChange={(e) => setStage(e.target.value)}>
              {stageOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
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
