"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Select, SelectItem } from "@heroui/react";
import { Edit, Save, X } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

interface UserManagementPanelProps {
  darkMode: boolean;
  onClose: () => void;
}

const UserManagementPanel: React.FC<UserManagementPanelProps> = ({ darkMode, onClose }) => {
  const { setToast } = useAppContext();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>("");

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditClick = (user: User) => {
    setEditingUserId(user._id);
    setNewRole(user.role);
  };

  const handleSaveClick = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user role");
      }

      // Update the local state with the new role
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user._id === userId ? { ...user, role: newRole } : user
        )
      );
      setEditingUserId(null);
      setNewRole("");
      setToast({ message: "User role updated successfully!", type: "success" });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during role update";
      setError(errorMessage);
      setToast({ message: `Error updating role: ${errorMessage}`, type: "error" });
    }
  };

  const handleCancelClick = () => {
    setEditingUserId(null);
    setNewRole("");
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users"); // Changed from /api/user to /api/users
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (isLoading) {
    return <div className="p-4">Loading users...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className={`p-4 h-full overflow-auto ${darkMode ? "text-white" : "text-black"}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">User Management</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <Table aria-label="User data table" className="min-w-full">
        <TableHeader>
          <TableColumn>Username</TableColumn>
          <TableColumn>Email</TableColumn>
          <TableColumn>Role</TableColumn>
          <TableColumn>Created At</TableColumn>
          <TableColumn>Actions</TableColumn>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user._id}>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {editingUserId === user._id ? (
                  <Select
                    selectedKeys={[newRole]}
                    onSelectionChange={(keys) => setNewRole(Array.from(keys)[0] as string)}
                    className="max-w-xs"
                    aria-label="Select Role"
                  >
                    <SelectItem key="admin">Admin</SelectItem>
                    <SelectItem key="user">User</SelectItem>
                  </Select>
                ) : (
                  user.role
                )}
              </TableCell>
              <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                {editingUserId === user._id ? (
                  <div className="flex gap-2">
                    <Button isIconOnly size="sm" onClick={() => handleSaveClick(user._id)} color="success" aria-label="Save">
                      <Save size={16} />
                    </Button>
                    <Button isIconOnly size="sm" onClick={handleCancelClick} color="danger" aria-label="Cancel">
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <Button isIconOnly size="sm" onClick={() => handleEditClick(user)} color="primary" aria-label="Edit">
                    <Edit size={16} />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserManagementPanel;