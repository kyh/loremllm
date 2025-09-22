"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useChat, Chat } from "@ai-sdk/react";
import type { DataUIPart, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";

const DEFAULT_API_URL =
  process.env.NEXT_PUBLIC_MOCK_API_URL ?? "http://localhost:3000/api/chat";

type MatchingData = Record<string, unknown>;

type TextPart = { type: "text"; text: string };
type ToolPart = {
  type: `tool-${string}` | "dynamic-tool";
  toolCallId: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTextPart = (part: unknown): part is TextPart => {
  if (!isObject(part)) {
    return false;
  }

  const { type, text } = part as { type?: unknown; text?: unknown };

  return type === "text" && typeof text === "string";
};

const isToolPart = (part: unknown): part is ToolPart => {
  if (!isObject(part)) {
    return false;
  }

  const { type, toolCallId, toolName } = part as {
    type?: unknown;
    toolCallId?: unknown;
    toolName?: unknown;
  };

  if (type === "dynamic-tool") {
    return typeof toolCallId === "string" && typeof toolName === "string";
  }

  if (typeof type === "string" && type.startsWith("tool-")) {
    return typeof toolCallId === "string";
  }

  return false;
};

const roleLabel: Record<UIMessage["role"], string> = {
  system: "System",
  user: "You",
  assistant: "Assistant",
};

const roleAccent: Record<UIMessage["role"], string> = {
  system: "#8b5cf6",
  user: "#60a5fa",
  assistant: "#34d399",
};

const formatSimilarity = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return `${(value * 100).toFixed(1)}%`;
};

const ExampleChatPage = () => {
  const [scenarioId, setScenarioId] = useState("");
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [apiKey, setApiKey] = useState("");
  const [input, setInput] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [dataParts, setDataParts] = useState<Record<string, unknown>>({});
  const [messageMetadata, setMessageMetadata] = useState<MatchingData | null>(null);

  const handleData = useCallback((part: DataUIPart<Record<string, unknown>>) => {
    const key = part.type.startsWith("data-")
      ? part.type.slice("data-".length)
      : part.type;

    setDataParts((previous) => ({
      ...previous,
      [part.id ? `${key}#${part.id}` : key]: part.data,
    }));
  }, []);

  const handleFinish = useCallback(({ message }: { message: UIMessage }) => {
    const metadata = message.metadata;

    if (metadata && typeof metadata === "object") {
      setMessageMetadata(metadata as MatchingData);
    } else {
      setMessageMetadata(null);
    }
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: apiUrl,
        headers: apiKey ? { "x-api-key": apiKey } : undefined,
        prepareSendMessagesRequest: ({ body }) => ({
          body: {
            ...(body ?? {}),
            scenarioId: scenarioId.trim(),
          },
        }),
        prepareReconnectToStreamRequest: ({ body }) => ({
          body: {
            ...(body ?? {}),
            scenarioId: scenarioId.trim(),
          },
        }),
      }),
    [apiUrl, apiKey, scenarioId],
  );

  const chat = useMemo(
    () =>
      new Chat({
        transport,
        onData: handleData,
        onFinish: (event) => handleFinish({ message: event.message }),
      }),
    [transport, handleData, handleFinish],
  );

  const { messages, sendMessage, status, error, setMessages, stop, resumeStream, regenerate, clearError } =
    useChat({ chat });

  useEffect(() => {
    setMessages([]);
    setDataParts({});
    setMessageMetadata(null);
  }, [scenarioId, setMessages]);

  useEffect(() => {
    if (status === "submitted") {
      setDataParts({});
      setMessageMetadata(null);
    }
  }, [status]);

  useEffect(() => {
    setClientError(null);
  }, [scenarioId, apiUrl, apiKey]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedScenarioId = scenarioId.trim();
      const trimmedInput = input.trim();

      if (!trimmedScenarioId) {
        setClientError("Add a scenario ID before chatting.");
        return;
      }

      if (!trimmedInput) {
        return;
      }

      setClientError(null);

      try {
        await sendMessage({ text: trimmedInput });
        setInput("");
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unknown error";
        setClientError(message);
      }
    },
    [scenarioId, input, sendMessage],
  );

  const handleReset = useCallback(() => {
    setMessages([]);
    setDataParts({});
    setMessageMetadata(null);
    setClientError(null);
  }, [setMessages]);

  const isBusy = status === "submitted" || status === "streaming";
  const matching = Object.entries(dataParts).reduce<MatchingData | null>((acc, [key, value]) => {
    if (!key.startsWith("matching")) {
      return acc;
    }

    const next = { ...(acc ?? {}) };

    if (value !== null && typeof value === "object") {
      Object.assign(next, value as Record<string, unknown>);
    } else {
      next[key] = value;
    }

    return next;
  }, null);

  const activeMetadata = messageMetadata ?? matching;
  const similarityValue =
    typeof activeMetadata?.similarity === "number" ? activeMetadata.similarity : null;

  return (
    <main
      style={{
        display: "flex",
        minHeight: "100vh",
        padding: "32px",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "min(960px, 100%)",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          padding: "32px",
          borderRadius: "24px",
          background: "rgba(15, 18, 24, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 30px 60px rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(20px)",
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 600 }}>Mock Chat Playground</h1>
            <p style={{ margin: "8px 0 0", color: "rgba(226, 232, 240, 0.75)", lineHeight: 1.6 }}>
              Point this UI at the mock <code>/api/chat</code> endpoint to iterate on your chat experiences without
              hitting real LLMs. Configure the scenario ID, optional API key, and stream responses powered by the
              AI SDK&apos;s React helpers.
            </p>
          </div>

          <section
            aria-label="Connection configuration"
            style={{
              display: "grid",
              gap: "12px",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "0.875rem", color: "rgba(226, 232, 240, 0.86)", fontWeight: 500 }}>
                Scenario ID
              </span>
              <input
                value={scenarioId}
                onChange={(event) => setScenarioId(event.target.value)}
                placeholder="mock scenario UUID"
                style={{
                  borderRadius: "10px",
                  padding: "10px 12px",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  background: "rgba(15, 23, 42, 0.7)",
                  color: "#f8fafc",
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "0.875rem", color: "rgba(226, 232, 240, 0.86)", fontWeight: 500 }}>
                API URL
              </span>
              <input
                value={apiUrl}
                onChange={(event) => setApiUrl(event.target.value)}
                placeholder="http://localhost:3000/api/chat"
                style={{
                  borderRadius: "10px",
                  padding: "10px 12px",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  background: "rgba(15, 23, 42, 0.7)",
                  color: "#f8fafc",
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "0.875rem", color: "rgba(226, 232, 240, 0.86)", fontWeight: 500 }}>
                API Key (optional)
              </span>
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Paste dev key if required"
                style={{
                  borderRadius: "10px",
                  padding: "10px 12px",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  background: "rgba(15, 23, 42, 0.7)",
                  color: "#f8fafc",
                }}
              />
            </label>
          </section>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "0.875rem",
                padding: "4px 10px",
                borderRadius: "9999px",
                background: "rgba(59, 130, 246, 0.2)",
                border: "1px solid rgba(59, 130, 246, 0.4)",
              }}
            >
              Status: <strong style={{ color: "#bfdbfe" }}>{status}</strong>
            </span>
            {error && (
              <span style={{ color: "#fca5a5", fontSize: "0.875rem" }}>
                {error.message}
                <button
                  type="button"
                  onClick={() => clearError()}
                  style={{
                    marginLeft: "8px",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    border: "1px solid rgba(248, 113, 113, 0.45)",
                    background: "rgba(248, 113, 113, 0.15)",
                    color: "#fee2e2",
                    cursor: "pointer",
                  }}
                >
                  Dismiss
                </button>
              </span>
            )}
            {clientError && !error && (
              <span style={{ color: "#fca5a5", fontSize: "0.875rem" }}>{clientError}</span>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => stop()}
                disabled={!isBusy}
                style={{
                  padding: "8px 14px",
                  borderRadius: "9999px",
                  border: "1px solid rgba(248, 250, 252, 0.2)",
                  background: isBusy ? "rgba(248, 250, 252, 0.1)" : "transparent",
                  color: "#e2e8f0",
                  cursor: isBusy ? "pointer" : "not-allowed",
                }}
              >
                Stop
              </button>
              <button
                type="button"
                onClick={() => regenerate()}
                disabled={!messages.length || isBusy}
                style={{
                  padding: "8px 14px",
                  borderRadius: "9999px",
                  border: "1px solid rgba(248, 250, 252, 0.2)",
                  background: !messages.length || isBusy ? "transparent" : "rgba(248, 250, 252, 0.08)",
                  color: "#e2e8f0",
                  cursor: !messages.length || isBusy ? "not-allowed" : "pointer",
                }}
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={() => resumeStream()}
                disabled={status !== "submitted" && status !== "streaming"}
                style={{
                  padding: "8px 14px",
                  borderRadius: "9999px",
                  border: "1px solid rgba(248, 250, 252, 0.2)",
                  background: status === "submitted" ? "rgba(248, 250, 252, 0.1)" : "transparent",
                  color: "#e2e8f0",
                  cursor: status === "submitted" ? "pointer" : "not-allowed",
                }}
              >
                Resume
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: "8px 14px",
                  borderRadius: "9999px",
                  border: "1px solid rgba(203, 213, 225, 0.35)",
                  background: "transparent",
                  color: "#cbd5f5",
                  cursor: "pointer",
                }}
              >
                Clear chat
              </button>
            </div>
          </div>
        </header>

        {activeMetadata && (
          <section
            aria-label="Match metadata"
            style={{
              borderRadius: "18px",
              border: "1px solid rgba(59, 130, 246, 0.35)",
              background: "rgba(30, 64, 175, 0.25)",
              padding: "18px",
              color: "#dbeafe",
              fontSize: "0.95rem",
              display: "grid",
              gap: "6px",
            }}
          >
            <div style={{ fontWeight: 600, letterSpacing: 0.3 }}>Matched interaction details</div>
            <div style={{ display: "grid", gap: "4px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {Object.entries(activeMetadata).map(([key, value]) => {
                const formattedValue =
                  value && typeof value === "object"
                    ? JSON.stringify(value, null, 2)
                    : String(value);

                return (
                  <span key={key} style={{ color: "rgba(219, 234, 254, 0.9)" }}>
                    <strong style={{ color: "#bfdbfe" }}>{key}</strong>: {formattedValue}
                  </span>
                );
              })}
            </div>
            {similarityValue !== null && (
              <span style={{ color: "rgba(191, 219, 254, 0.9)" }}>
                Similarity: <strong>{formatSimilarity(similarityValue)}</strong>
              </span>
            )}
          </section>
        )}

        <section
          aria-label="Conversation"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxHeight: "60vh",
            overflowY: "auto",
            paddingRight: "8px",
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                padding: "36px",
                borderRadius: "18px",
                border: "1px dashed rgba(148, 163, 184, 0.4)",
                textAlign: "center",
                color: "rgba(226, 232, 240, 0.7)",
              }}
            >
              Provide a scenario ID, send a message, and watch the mock assistant stream the scripted response.
            </div>
          ) : (
            messages.map((message) => {
              const textParts = message.parts.filter(isTextPart);
              const texts = textParts.map((part) => part.text).join("").trim();

              const toolParts: ToolPart[] = message.parts.filter(isToolPart);

              return (
                <article
                  key={message.id}
                  style={{
                    display: "grid",
                    gap: "10px",
                    padding: "18px",
                    borderRadius: "18px",
                    border: `1px solid ${roleAccent[message.role]}40`,
                    background: "rgba(15, 23, 42, 0.65)",
                  }}
                >
                  <header style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: `${roleAccent[message.role]}33`,
                        color: roleAccent[message.role],
                        fontWeight: 600,
                      }}
                    >
                      {roleLabel[message.role][0]}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <strong style={{ color: roleAccent[message.role] }}>{roleLabel[message.role]}</strong>
                      {message.metadata && (
                        <span style={{ fontSize: "0.8rem", color: "rgba(148, 163, 184, 0.85)" }}>
                          metadata: {JSON.stringify(message.metadata)}
                        </span>
                      )}
                    </div>
                  </header>
                  {texts && (
                    <p style={{ margin: 0, lineHeight: 1.65, color: "rgba(241, 245, 249, 0.92)" }}>{texts}</p>
                  )}
                  {toolParts.length > 0 && (
                    <div
                      style={{
                        borderRadius: "14px",
                        border: "1px solid rgba(34, 197, 94, 0.35)",
                        background: "rgba(22, 101, 52, 0.25)",
                        padding: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <strong style={{ color: "#bbf7d0", fontSize: "0.9rem" }}>Tool calls</strong>
                      {toolParts.map((part) => {
                        const toolIdentifier =
                          part.type === "dynamic-tool"
                            ? part.toolName ?? "dynamic-tool"
                            : part.type.slice("tool-".length);

                        return (
                          <div key={part.toolCallId} style={{ fontSize: "0.85rem", color: "#dcfce7" }}>
                            <div>
                              <strong>{toolIdentifier}</strong>{" "}
                              <span style={{ opacity: 0.7 }}>({part.state ?? "unknown state"})</span>
                            </div>
                            {part.input !== undefined && (
                              <pre
                                style={{
                                  margin: "6px 0 0",
                                  padding: "10px",
                                  borderRadius: "10px",
                                  background: "rgba(15, 23, 42, 0.6)",
                                  border: "1px solid rgba(148, 163, 184, 0.35)",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {JSON.stringify(part.input, null, 2)}
                              </pre>
                            )}
                            {part.output !== undefined && (
                              <pre
                                style={{
                                  margin: "6px 0 0",
                                  padding: "10px",
                                  borderRadius: "10px",
                                  background: "rgba(15, 23, 42, 0.6)",
                                  border: "1px solid rgba(148, 163, 184, 0.35)",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {JSON.stringify(part.output, null, 2)}
                              </pre>
                            )}
                            {part.errorText && (
                              <div style={{ marginTop: "6px", color: "#fecaca" }}>{part.errorText}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "12px",
            borderRadius: "18px",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            padding: "20px",
            background: "rgba(15, 23, 42, 0.7)",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "0.9rem", color: "rgba(226, 232, 240, 0.8)" }}>Message</span>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Send a prompt to your mock assistant"
              rows={4}
              style={{
                resize: "vertical",
                minHeight: "96px",
                borderRadius: "14px",
                padding: "12px 14px",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                background: "rgba(15, 23, 42, 0.6)",
                color: "#f8fafc",
              }}
            />
          </label>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "rgba(148, 163, 184, 0.85)" }}>
              Streaming via <code>DefaultChatTransport</code>
            </span>
            <button
              type="submit"
              disabled={isBusy}
              style={{
                padding: "10px 20px",
                borderRadius: "9999px",
                border: "none",
                background: isBusy ? "rgba(59, 130, 246, 0.35)" : "rgba(59, 130, 246, 0.85)",
                color: "white",
                fontWeight: 600,
                cursor: isBusy ? "not-allowed" : "pointer",
                transition: "background 0.2s ease",
              }}
            >
              {isBusy ? "Streaming..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default ExampleChatPage;
