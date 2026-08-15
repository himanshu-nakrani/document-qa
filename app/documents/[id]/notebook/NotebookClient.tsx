"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { NotebookView } from "../../../components/NotebookView";
import { StoreProvider } from "../../../lib/store";

interface NotebookClientProps {
  params: Promise<{ id: string }>;
}

function NotebookPageContent({ documentId }: { documentId: string }) {
  const router = useRouter();
  return <NotebookView documentId={documentId} onClose={() => router.push("/dashboard")} />;
}

/**
 * Client half of the notebook route (see page.tsx for the metadata shell).
 */
export default function NotebookClient({ params }: NotebookClientProps) {
  const { id } = use(params);

  return (
    <StoreProvider>
      <NotebookPageContent documentId={id} />
    </StoreProvider>
  );
}
