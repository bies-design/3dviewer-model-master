"use client";

import React, { useEffect } from "react";
import { Toaster, toast } from 'sonner';
import { useAppContext } from "@/contexts/AppContext";
import LoginModal from "@/components/LoginModal";
import RegisterModal from "@/components/RegisterModal";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { showLoginModal, setShowLoginModal, showRegisterModal, setShowRegisterModal, toast: appToast, setToast } = useAppContext();

  useEffect(() => {
    if (appToast) {
      if (appToast.type === 'success') {
        toast.success(appToast.message);
      } else if (appToast.type === 'error') {
        toast.error(appToast.message);
      } else {
        toast(appToast.message);
      }
      setToast(null); // Clear the toast after showing
    }
  }, [appToast, setToast]);

  return (
    <>
      <div className="relative flex flex-col h-screen">
        {children}
      </div>
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onSwitchToRegister={() => { setShowLoginModal(false); setShowRegisterModal(true); }} />}
      {showRegisterModal && <RegisterModal onClose={() => setShowRegisterModal(false)} onSwitchToLogin={() => { setShowRegisterModal(false); setShowLoginModal(true); }} />}
      <Toaster />
    </>
  );
}