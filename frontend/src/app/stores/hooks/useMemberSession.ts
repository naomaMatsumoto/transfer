import { useEffect, useState } from "react";
import { DEMO_USER_ID } from "../constants";
import { fetchMemberMe } from "../api";

export function useMemberSession() {
  const [memberId, setMemberId] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetchMemberMe()
      .then((data) => setMemberId(data?.id ?? null))
      .catch(() => setMemberId(null))
      .finally(() => setChecked(true));
  }, []);

  const isLoggedIn = memberId != null;
  const effectiveUserId = memberId ?? DEMO_USER_ID;

  return { memberId, checked: checked, isLoggedIn, effectiveUserId };
}
