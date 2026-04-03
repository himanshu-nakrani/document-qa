"use client";

import React, { useState } from "react";
import { StoreProvider, useStore } from "./lib/store";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import UploadModal from "./components/UploadModal";
import SettingsPanel from "./components/SettingsPanel";

function AppShell() {
  const { state, dispatch } = useStore();
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Sidebar */}
      <Sidebar onUploadClick={() => setUploadOpen(true)} />

      {/* Main chat area */}
      <ChatArea onUploadClick={() => setUploadOpen(true)} />

      {/* Modals */}
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <SettingsPanel
        open={state.settingsOpen}
        onClose={() => dispatch({ type: "SET_SETTINGS_OPEN", payload: false })}
      />
    </div>
  );
}

export default function Home() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
