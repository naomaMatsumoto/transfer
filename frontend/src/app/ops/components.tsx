"use client";

import React from "react";
import { CorpStatus, STATUS_CFG } from "./types";
import s from "./ops.module.scss";

/* ================================================================
   Modal
   ================================================================ */
type ModalProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={`card shadow ${s.modalCard}`} onClick={(e) => e.stopPropagation()}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <span className="fw-semibold">{title}</span>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>
        <div className="card-body">{children}</div>
      </div>
    </div>
  );
}

/* ================================================================
   ConfirmModal
   ================================================================ */
type ConfirmModalProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  title,
  message,
  confirmLabel = "削除する",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className={s.modalOverlay} onClick={onCancel}>
      <div className={`card shadow ${s.modalCard}`} onClick={(e) => e.stopPropagation()}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <span className="fw-semibold">{title}</span>
          <button type="button" className="btn-close" onClick={onCancel} />
        </div>
        <div className="card-body">
          <p className="mb-4" style={{ whiteSpace: "pre-line" }}>{message}</p>
          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel} disabled={loading}>
              キャンセル
            </button>
            <button
              type="button"
              className={`btn btn-sm ${danger ? "btn-danger" : "btn-dark"}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "処理中…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   PageHeader
   ================================================================ */
type PageHeaderProps = {
  title: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className={s.pageHeader}>
      <h1 className={s.pageTitle}>{title}</h1>
      {action}
    </div>
  );
}

/* ================================================================
   StatCard
   ================================================================ */
type StatCardProps = {
  label: string;
  value: number | string;
  sub?: string;
};

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className={s.statCard}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue}>{value}</div>
      {sub && <div className={s.statSub}>{sub}</div>}
    </div>
  );
}

/* ================================================================
   StatusBadge
   ================================================================ */
export function StatusBadge({ status }: { status?: CorpStatus | string }) {
  const cfg = STATUS_CFG[(status ?? "active") as CorpStatus] ?? STATUS_CFG.active;
  return <span className={`badge ${cfg.cls}`}>{cfg.text}</span>;
}

/* ================================================================
   DataTable
   ================================================================ */
type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
};

export function DataTable<T>({ columns, rows, rowKey }: DataTableProps<T>) {
  return (
    <div className="card shadow-sm">
      <div className="table-responsive mb-0">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((col) => (
                  <td key={col.key} className={col.className}>{col.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================
   Loading / Empty / Error states
   ================================================================ */
export function Loading({ text = "読み込み中…" }: { text?: string }) {
  return <p className="text-body-secondary">{text}</p>;
}

export function Empty({ text }: { text: string }) {
  return <p className="text-body-secondary">{text}</p>;
}

export function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="alert alert-danger">{message}</div>;
}

/* ================================================================
   Pagination
   ================================================================ */
type PaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="d-flex justify-content-center gap-2 mt-3">
      <button
        className="btn btn-outline-dark btn-sm"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        前へ
      </button>
      <span className="small align-self-center">{page + 1} / {totalPages}</span>
      <button
        className="btn btn-outline-dark btn-sm"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
      >
        次へ
      </button>
    </div>
  );
}

/* ================================================================
   FilterBar
   ================================================================ */
type FilterBarProps = {
  children: React.ReactNode;
};

export function FilterBar({ children }: FilterBarProps) {
  return (
    <div className={s.filterBar}>{children}</div>
  );
}
