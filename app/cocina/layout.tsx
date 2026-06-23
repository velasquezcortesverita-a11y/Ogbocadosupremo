import { cookies } from "next/headers";
import PinGate from "@/components/cocina/PinGate";

export default async function CocinaLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const auth = cookieStore.get("cocina_auth");

  if (!auth?.value) {
    return <PinGate />;
  }

  return <>{children}</>;
}
