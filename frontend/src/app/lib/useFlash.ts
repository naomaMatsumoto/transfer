"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const FLASH_VISIBLE_MS = 3000;
const FLASH_ERR_VISIBLE_MS = 5000;
const FLASH_EXIT_ANIMATION_MS = 300;

export type FlashState = {
  msg: string | null;
  err: string | null;
  msgExiting: boolean;
  errExiting: boolean;
  flash: (m: string) => void;
  flashErr: (m: string) => void;
};

/**
 * フラッシュメッセージ（成功・エラー）の表示制御フック。
 * admin/members, admin/reservations, ops/corporations/[id]/stores/[storeId]/events
 * の3箇所で同一実装が重複していたため共通化。
 */
export function useFlash(): FlashState {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msgExiting, setMsgExiting] = useState(false);
  const [errExiting, setErrExiting] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => () => clear(), [clear]);

  const flash = useCallback(
    (m: string) => {
      clear();
      setErr(null);
      setErrExiting(false);
      setMsg(m);
      setMsgExiting(false);
      timers.current.push(
        setTimeout(() => setMsgExiting(true), FLASH_VISIBLE_MS),
        setTimeout(() => {
          setMsg(null);
          setMsgExiting(false);
        }, FLASH_VISIBLE_MS + FLASH_EXIT_ANIMATION_MS),
      );
    },
    [clear],
  );

  const flashErr = useCallback(
    (m: string) => {
      clear();
      setMsg(null);
      setMsgExiting(false);
      setErr(m);
      setErrExiting(false);
      timers.current.push(
        setTimeout(() => setErrExiting(true), FLASH_ERR_VISIBLE_MS),
        setTimeout(() => {
          setErr(null);
          setErrExiting(false);
        }, FLASH_ERR_VISIBLE_MS + FLASH_EXIT_ANIMATION_MS),
      );
    },
    [clear],
  );

  return { msg, err, msgExiting, errExiting, flash, flashErr };
}
