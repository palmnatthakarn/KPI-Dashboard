import { KpiColors } from "@/lib/kpi/kpi-constants";

/** Ported from user_avatar.dart — colored circle avatar showing the first letter of a name. */
export function UserAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  const color = colorForName(name);

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return KpiColors.avatarColors[hash % KpiColors.avatarColors.length];
}
