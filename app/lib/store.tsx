"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
  type Dispatch,
} from "react";
import type { DocumentInfo, ConversationListItem, Message, Provider } from "./api";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface AppSettings {
  provider: Provider;
  chatModel: string;
  embeddingModel: string;
  apiKey: string;
}

export interface AppState {
  settings: AppSettings;
  documents: DocumentInfo[];
  activeDocumentId: string | null;
  conversations: ConversationListItem[];
  activeConversationId: string | null;
  messages: Message[];
  sidebarOpen: boolean;
  settingsOpen: boolean;
}

const DEFAULT_CHAT: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
};

const DEFAULT_EMBEDDING: Record<Provider, string> = {
  openai: "text-embedding-3-small",
  gemini: "models/gemini-embedding-001",
};

function loadSettings(): AppSettings {
  if (typeof window === "undefined") {
    return {
      provider: "openai",
      chatModel: DEFAULT_CHAT.openai,
      embeddingModel: DEFAULT_EMBEDDING.openai,
      apiKey: "",
    };
  }
  try {
    const raw = localStorage.getItem("rag-settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      const prov: Provider = parsed.provider === "gemini" ? "gemini" : "openai";
      let embeddingModel = parsed.embeddingModel ?? DEFAULT_EMBEDDING[prov];
      // Migration for deprecated models
      if (embeddingModel === "models/text-embedding-004") {
        embeddingModel = DEFAULT_EMBEDDING[prov];
      }
      return {
        provider: prov,
        chatModel: parsed.chatModel ?? DEFAULT_CHAT[prov],
        embeddingModel,
        apiKey: parsed.apiKey ?? "",
      };
    }
  } catch { /* use defaults */ }
  return {
    provider: "openai",
    chatModel: DEFAULT_CHAT.openai,
    embeddingModel: DEFAULT_EMBEDDING.openai,
    apiKey: "",
  };
}

const initialState: AppState = {
  settings: loadSettings(),
  documents: [],
  activeDocumentId: null,
  conversations: [],
  activeConversationId: null,
  messages: [],
  sidebarOpen: true,
  settingsOpen: false,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type Action =
  | { type: "SET_SETTINGS"; payload: Partial<AppSettings> }
  | { type: "SET_PROVIDER"; payload: Provider }
  | { type: "SET_DOCUMENTS"; payload: DocumentInfo[] }
  | { type: "UPDATE_DOCUMENT"; payload: DocumentInfo }
  | { type: "REMOVE_DOCUMENT"; payload: string }
  | { type: "SET_ACTIVE_DOCUMENT"; payload: string | null }
  | { type: "SET_CONVERSATIONS"; payload: ConversationListItem[] }
  | { type: "SET_ACTIVE_CONVERSATION"; payload: string | null }
  | { type: "SET_MESSAGES"; payload: Message[] }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "APPEND_TO_LAST_MESSAGE"; payload: string }
  | { type: "UPDATE_LAST_MESSAGE_SOURCES"; payload: string[] }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_SIDEBAR"; payload: boolean }
  | { type: "TOGGLE_SETTINGS" }
  | { type: "SET_SETTINGS_OPEN"; payload: boolean };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_SETTINGS": {
      const next = { ...state.settings, ...action.payload };
      if (typeof window !== "undefined") {
        localStorage.setItem("rag-settings", JSON.stringify(next));
      }
      return { ...state, settings: next };
    }
    case "SET_PROVIDER": {
      const p = action.payload;
      const next: AppSettings = {
        ...state.settings,
        provider: p,
        chatModel: DEFAULT_CHAT[p],
        embeddingModel: DEFAULT_EMBEDDING[p],
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("rag-settings", JSON.stringify(next));
      }
      return { ...state, settings: next };
    }
    case "SET_DOCUMENTS":
      return { ...state, documents: action.payload };
    case "UPDATE_DOCUMENT":
      return {
        ...state,
        documents: state.documents.map((d) =>
          d.id === action.payload.id ? action.payload : d
        ),
      };
    case "REMOVE_DOCUMENT":
      return {
        ...state,
        documents: state.documents.filter((d) => d.id !== action.payload),
        activeDocumentId:
          state.activeDocumentId === action.payload
            ? null
            : state.activeDocumentId,
        activeConversationId:
          state.activeDocumentId === action.payload
            ? null
            : state.activeConversationId,
        messages:
          state.activeDocumentId === action.payload ? [] : state.messages,
      };
    case "SET_ACTIVE_DOCUMENT":
      return {
        ...state,
        activeDocumentId: action.payload,
        conversations: [],
        activeConversationId: null,
        messages: [],
      };
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.payload };
    case "SET_ACTIVE_CONVERSATION":
      return { ...state, activeConversationId: action.payload };
    case "SET_MESSAGES":
      return { ...state, messages: action.payload };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };
    case "APPEND_TO_LAST_MESSAGE": {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content: last.content + action.payload };
      }
      return { ...state, messages: msgs };
    }
    case "UPDATE_LAST_MESSAGE_SOURCES": {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, sources: action.payload };
      }
      return { ...state, messages: msgs };
    }
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case "SET_SIDEBAR":
      return { ...state, sidebarOpen: action.payload };
    case "TOGGLE_SETTINGS":
      return { ...state, settingsOpen: !state.settingsOpen };
    case "SET_SETTINGS_OPEN":
      return { ...state, settingsOpen: action.payload };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const StoreContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => {},
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate settings from localStorage on mount
  useEffect(() => {
    const settings = loadSettings();
    dispatch({ type: "SET_SETTINGS", payload: settings });
  }, []);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}

export { DEFAULT_CHAT, DEFAULT_EMBEDDING };
