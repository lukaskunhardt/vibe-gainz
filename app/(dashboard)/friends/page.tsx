import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FriendsTimeline } from "@/components/friends/friends-timeline";

export default async function FriendsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Friends</h1>
      <FriendsTimeline userId={user.id} />
    </div>
  );
}
