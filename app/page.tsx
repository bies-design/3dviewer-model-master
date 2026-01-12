"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import IFCViewerContainer from "@/containers/IFCViewerContainer";
import { useAppContext } from "@/contexts/AppContext";
import { useSession } from "next-auth/react";

export default function Home() {
  const router = useRouter();
  const { darkMode, setIsLoggedIn, setUser } = useAppContext();
  const { data: session, status } = useSession();

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      router.push('/mobile');
    }
  }, [router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setIsLoggedIn(true);
      const user = {
        _id: session.user.id || "", // Assuming session.user.id exists, otherwise provide a placeholder
        username: session.user.name || "",
        email: session.user.email || "",
        role: 'user' as 'user', // Default role, explicitly cast to literal type
        createdAt: new Date(), // Default creation date
        updatedAt: new Date(), // Default update date
      };
      setUser(user);
    }
  }, [status, session, setIsLoggedIn, setUser]);

  return (
    <div
      className={`h-screen flex flex-col ${
        darkMode ? "bg-custom-zinc-900 bg-main-gradient text-white" : "bg-white text-gray-800"
      }`}
    >
      <main className="flex-1">
        <IFCViewerContainer />
      </main>
    </div>
  );
}
