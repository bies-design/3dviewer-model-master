"use client";

import React, { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { useTranslation } from "react-i18next";
import { Input, Button, Alert } from "@heroui/react";
import Image from "next/image";
import AvatarModal from "@/components/IFCViewer/AvatarModal";
import { LogIn, LogOut, ChevronLeft } from "lucide-react";

interface UserPanelProps {
  languageSwitcher: React.ReactNode;
  handleLogout: () => void;
  setShowLoginModal: (show: boolean) => void;
  onClose?: () => void;
}

const UserPanel: React.FC<UserPanelProps> = ({ languageSwitcher, handleLogout, setShowLoginModal, onClose }) => {
  const { user, setUser, isLoggedIn } = useAppContext();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const { t } = useTranslation();
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      setUser(data.user);
      setSuccess("User data updated successfully.");
      setIsEditing(false);
      setPassword("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{t("user-panel-title")}</h2>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <ChevronLeft size={24} />
          </button>
        )}
      </div>
      {user && (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Image
              src={user.avatar || "/default-avatar.svg"}
              alt="User Avatar"
              width={96}
              height={96}
              className="rounded-full"
            />
            <Button onClick={() => setIsAvatarModalOpen(true)}>Change Avatar</Button>
          </div>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Input
                  label={t("username")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <Input
                  label={t("email")}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <hr className="my-4" />
              <div>
                <Input
                  label="Current Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleSave}>Save</Button>
                <Button onClick={() => setIsEditing(false)} color="secondary">Cancel</Button>
              </div>
              {error && <Alert color="danger">{error}</Alert>}
              {success && <Alert color="success">{success}</Alert>}
            </div>
          ) : (
            <div>
              <p>
                <strong>{t("username")}:</strong> {user.username}
              </p>
              <p>
                <strong>{t("email")}:</strong> {user.email}
              </p>
              <p>
                <strong>{t("role")}:</strong> {user.role}
              </p>
              <Button onClick={() => {
                setIsEditing(true);
                setError("");
                setSuccess("");
              }} className="mt-4">Edit</Button>
            </div>
          )}
        </div>
      )}
      <div className="mt-4 pt-4 border-t">
        <h3 className="text-lg font-semibold mb-2">{t("language")}</h3>
        {languageSwitcher}
      </div>
      <div className="mt-4 pt-4 border-t">
        <Button onClick={handleLogout} color="danger" className="w-full">
          <LogOut size={20} className="mr-2" />
          Logout
        </Button>
      </div>
      {isAvatarModalOpen && (
        <AvatarModal
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          onAvatarSelect={async (avatarUrl: string) => {
            if (user) {
              const updatedUser = { ...user, avatar: avatarUrl };
              setUser(updatedUser);
              // Update the user in the database
              try {
                const response = await fetch('/api/user/update', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ avatar: avatarUrl }), // Only send avatar for update
                });
                if (!response.ok) {
                  console.error("Failed to update avatar in database");
                }
              } catch (error) {
                console.error("Error updating avatar in database:", error);
              }
            }
          }}
        />
      )}
    </div>
  );
};

export default UserPanel;
