import { redirect } from "next/navigation";

const VALID_TABS = ["classTypes", "events", "credits", "reservations"];

export default async function AdminIndexPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const tab = params?.tab && VALID_TABS.includes(params.tab) ? params.tab : "";
  const path = tab ? `/admin/reservations?tab=${tab}` : "/admin/reservations";
  redirect(path);
}
