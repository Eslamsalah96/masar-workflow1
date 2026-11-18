import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: {
      name: string;
    } | null;
  };
  children: ReactNode;
};

export default function AppShell({ user, children }: Props) {
  return (
    <div className="app-layout" dir="rtl">
      <Sidebar role={user.role} />

      <div className="app-main-area">
        <Header user={user} />
        <main className="app-page-content">{children}</main>
      </div>
    </div>
  );
}