"use client";

import React, { useState } from "react";
import { Input, Button } from "@heroui/react";
import { Mail, Lock, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

interface RegisterModalProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterModal({ onClose, onSwitchToLogin }: RegisterModalProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [repeatPasswordError, setRepeatPasswordError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVisiblePassword, setIsVisiblePassword] = useState(false);
  const [isVisibleRepeatPassword, setIsVisibleRepeatPassword] = useState(false);

  const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  const { } = useAppContext();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailError("");
    setPasswordError("");
    setRepeatPasswordError("");

    let hasError = false;
    if (!EMAIL_REGEX.test(email)) {
      setEmailError("Invalid email format (e.g., user@example.com)");
      hasError = true;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setPasswordError("Password must be at least 8 characters long and include uppercase, lowercase, and a number.");
      hasError = true;
    }
    if (password !== repeatPassword) {
      setRepeatPasswordError("Passwords do not match.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      onClose();
      onSwitchToLogin(); // Redirect to login after successful registration
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg dark:bg-gray-800 relative">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Register</h1>
        <form className="space-y-6" onSubmit={handleRegister}>
          <Input
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            startContent={<UserIcon className="text-gray-400" />}
          />
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (!EMAIL_REGEX.test(e.target.value)) {
                setEmailError("Invalid email format (e.g., user@example.com)");
              } else {
                setEmailError("");
              }
            }}
            startContent={<Mail className="text-gray-400" />}
            isInvalid={!!emailError}
            errorMessage={emailError}
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (!PASSWORD_REGEX.test(e.target.value)) {
                setPasswordError("Password must be at least 8 characters long and include uppercase, lowercase, and a number.");
              } else {
                setPasswordError("");
              }
            }}
            startContent={<Lock className="text-gray-400" />}
            endContent={
              <button className="focus:outline-none" type="button" onClick={() => setIsVisiblePassword(!isVisiblePassword)}>
                {isVisiblePassword ? (
                  <EyeOff className="text-2xl text-default-400 pointer-events-none" />
                ) : (
                  <Eye className="text-2xl text-default-400 pointer-events-none" />
                )}
              </button>
            }
            type={isVisiblePassword ? "text" : "password"}
            isInvalid={!!passwordError}
            errorMessage={passwordError}
          />
          <Input
            label="Repeat Password"
            placeholder="Confirm your password"
            value={repeatPassword}
            onChange={(e) => {
              setRepeatPassword(e.target.value);
              if (password !== e.target.value) {
                setRepeatPasswordError("Passwords do not match.");
              } else {
                setRepeatPasswordError("");
              }
            }}
            startContent={<Lock className="text-gray-400" />}
            endContent={
              <button className="focus:outline-none" type="button" onClick={() => setIsVisibleRepeatPassword(!isVisibleRepeatPassword)}>
                {isVisibleRepeatPassword ? (
                  <EyeOff className="text-2xl text-default-400 pointer-events-none" />
                ) : (
                  <Eye className="text-2xl text-default-400 pointer-events-none" />
                )}
              </button>
            }
            type={isVisibleRepeatPassword ? "text" : "password"}
            isInvalid={!!repeatPasswordError}
            errorMessage={repeatPasswordError}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button color="primary" className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Register'}
          </Button>
        </form>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <button onClick={onSwitchToLogin} className="font-medium text-blue-600 hover:underline dark:text-blue-500">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
