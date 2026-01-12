"use client";

interface HeaderToggleProps {
  darkMode: boolean;
}

export default function HeaderToggle({ darkMode }: HeaderToggleProps) {
  return (
    <header
      className={`w-full h-10 flex justify-center items-center transition-colors duration-300
        text-2xl font-semibold mx-auto
        ${darkMode ? "bg-gray-700 text-yellow-200" : "bg-gray-400 text-gray-700"}`}
    >
      Gomore Viewer
    </header>
  );
}
