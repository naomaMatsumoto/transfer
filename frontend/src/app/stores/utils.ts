export function formatTime(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 5);
}
