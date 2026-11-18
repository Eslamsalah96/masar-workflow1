
import { Suspense } from "react";
import WorkflowClient from "./WorkflowClient";

type WorkflowPageProps = {
  params: Promise<{ screen: string }>;
};

export default function WorkflowPage({ params }: WorkflowPageProps) {
  return (
    <Suspense
      fallback={
        <main
          dir="rtl"
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Tahoma, Arial",
            color: "#123b5d",
          }}
        >
          جاري تحميل المرحلة...
        </main>
      }
    >
      <WorkflowClient params={params} />
    </Suspense>
  );
}
