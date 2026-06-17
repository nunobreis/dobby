import { PawPrint } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SidebarNav from "./SidebarNav";

export default async function Sidebar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("puppy_members")
    .select("puppy_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return null;

  const username = user.email?.split("@")[0] ?? "User";
  const initial = username[0].toUpperCase();

  return (
    <aside className="hidden lg:flex flex-col w-[220px] shrink-0 bg-white border-r border-[#E0E0E0] h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-[72px] px-5">
        <PawPrint size={24} className="text-accent" />
        <span className="text-[12px] font-bold text-text-primary leading-tight">Dobby</span>
      </div>

      {/* Nav items */}
      <SidebarNav />

      {/* Spacer */}
      <div className="flex-1" />

      {/* User row */}
      <div className="flex items-center gap-3 h-[72px] px-4 border-t border-[#F0F0F0]">
        <div className="w-9 h-9 rounded-full bg-[#F2C4CE] flex items-center justify-center shrink-0">
          <span className="text-[14px] font-bold text-white">{initial}</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-bold text-text-primary truncate">{username}</span>
          <span className="text-[11px] text-text-secondary truncate">{user.email}</span>
        </div>
      </div>
    </aside>
  );
}
