import type { Metadata } from "next";

import NotebookClient from "./NotebookClient";

interface NotebookPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: NotebookPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Notebook",
    description: `Read and query document ${id} side by side in the Sourceful notebook.`,
  };
}

/**
 * Server shell for the notebook route: carries route metadata and mounts the
 * client notebook viewer.
 */
export default function NotebookPage({ params }: NotebookPageProps) {
  return <NotebookClient params={params} />;
}
