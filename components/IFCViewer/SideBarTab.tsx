import React from "react";

interface SideBarTabProps {
  name: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const SideBarTab: React.FC<SideBarTabProps> = ({ children }) => {
  return <div>{children}</div>;
};

export default SideBarTab;
