import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/lib/auth-options';
import SignOutButton from "@/app/components/sign-out-button";


export default async function Home() {
  const session = await getServerSession(authOptions);
  return (
    <div>
      <pre>{session?.user ? JSON.stringify(session?.user, null, 2) : "Not signed in"}</pre>
      <br />
      <SignOutButton />
    </div>
  );
}
