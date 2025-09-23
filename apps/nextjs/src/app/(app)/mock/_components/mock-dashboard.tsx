"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Chat, useChat } from "@ai-sdk/react";
import type { DataUIPart, ToolUIPart, UIMessage } from "ai";
import {
  DefaultChatTransport,
  getToolOrDynamicToolName,
  isToolOrDynamicToolUIPart,
} from "ai";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@repo/ui/drawer";
import { Input } from "@repo/ui/input";
import { Textarea } from "@repo/ui/textarea";
import { toast } from "@repo/ui/toast";
import { cn } from "@repo/ui/utils";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  Message,
  MessageAvatar,
  MessageContent,
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  Response,
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements";
import { Square } from "lucide-react";
import type { JsonValue } from "@repo/api/mock/mock-schema";
import type { RouterOutputs } from "@repo/api";
import { useTRPC } from "@/trpc/react";

type ScenarioFormState = {
  name: string;
  description: string;
};

type InteractionFormState = {
  title: string;
  description: string;
  userMessage: string;
  assistantMessage: string;
  toolCallsJson: string;
};

type ScenarioList = RouterOutputs["mock"]["scenario"]["list"];
type ScenarioDetail = RouterOutputs["mock"]["scenario"]["byId"];

type ToolCallDraft = {
  toolName: unknown;
  callId?: unknown;
  arguments?: unknown;
  result?: unknown;
};

type TextUIPart = { type: "text"; text: string };
type ToolLikeUIPart = Parameters<typeof getToolOrDynamicToolName>[0];

type MatchingData = Record<string, unknown>;

const emptyScenarioList: ScenarioList = [];

const defaultScenarioForm: ScenarioFormState = { name: "", description: "" };

const defaultInteractionForm: InteractionFormState = {
  title: "",
  description: "",
  userMessage: "",
  assistantMessage: "",
  toolCallsJson: "",
};

export const MockDashboard = () => {
  const trpc = useTRPC();
  const scenarioListQuery = useQuery(
    trpc.mock.scenario.list.queryOptions(undefined),
  );
  const scenarios = scenarioListQuery.data ?? emptyScenarioList;
  const { refetch: refetchScenarios, isPending: isFetchingScenarios } = scenarioListQuery;
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [scenarioForm, setScenarioForm] = useState<ScenarioFormState>(defaultScenarioForm);

  useEffect(() => {
    if (!selectedScenarioId && scenarios.length > 0) {
      setSelectedScenarioId(scenarios[0]?.id ?? null);
    }
  }, [scenarios, selectedScenarioId]);

  const createScenario = useMutation({
    ...trpc.mock.scenario.create.mutationOptions(),
    onSuccess: (data) => {
      void refetchScenarios();
      setScenarioForm(defaultScenarioForm);
      setSelectedScenarioId(data.id);
      toast.success("Scenario created");
    },
    onError: () => {
      toast.error("Failed to create scenario");
    },
  });

  const deleteScenario = useMutation({
    ...trpc.mock.scenario.delete.mutationOptions(),
    onSuccess: () => {
      void refetchScenarios();
      toast.success("Scenario deleted");
      setSelectedScenarioId(null);
    },
    onError: () => {
      toast.error("Failed to delete scenario");
    },
  });

  const handleCreateScenario = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = scenarioForm.name.trim();

    if (!name.length) {
      toast.error("Scenario name is required");
      return;
    }

    createScenario.mutate({
      name,
      description: scenarioForm.description.trim() || undefined,
    });
  };

  const handleDeleteScenario = (id: string) => {
    const scenarioToDelete = scenarios.find((item) => item.id === id);
    const confirmed = window.confirm(
      `Delete scenario "${scenarioToDelete?.name ?? ""}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    deleteScenario.mutate({ scenarioId: id });
  };

  const selectedScenario = useMemo<ScenarioList[number] | null>(
    () =>
      selectedScenarioId
        ? scenarios.find((scenarioItem) => scenarioItem.id === selectedScenarioId) ?? null
        : null,
    [scenarios, selectedScenarioId],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-8">
      <div className="flex flex-col gap-4 md:flex-row">
        <Card className="w-full md:w-80">
          <CardHeader>
            <CardTitle>Scenarios</CardTitle>
            <CardDescription>
              Manage datasets that power your fake LLM endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  className={cn(
                    "rounded border px-3 py-2 text-left transition",
                    selectedScenarioId === scenario.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted",
                  )}
                  onClick={() => setSelectedScenarioId(scenario.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{scenario.name}</span>
                    <Badge variant="secondary">{scenario.interactionCount} mocks</Badge>
                  </div>
                  {scenario.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {scenario.description}
                    </p>
                  ) : null}
                </button>
              ))}
              {!isFetchingScenarios && !scenarios.length ? (
                <p className="rounded border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  Create a scenario to start mocking responses.
                </p>
              ) : null}
            </div>
            {selectedScenario ? (
              <Button
                variant="ghost"
                className="justify-start text-sm text-destructive hover:text-destructive"
                disabled={deleteScenario.isPending}
                onClick={() => handleDeleteScenario(selectedScenario.id)}
              >
                Delete selected
              </Button>
            ) : null}
            <form className="flex flex-col gap-2" onSubmit={handleCreateScenario}>
              <h3 className="font-semibold">New scenario</h3>
              <Input
                placeholder="Scenario name"
                value={scenarioForm.name}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setScenarioForm((state) => ({
                    ...state,
                    name: event.currentTarget.value,
                  }))
                }
                required
              />
              <Textarea
                placeholder="Optional description"
                value={scenarioForm.description}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setScenarioForm((state) => ({
                    ...state,
                    description: event.currentTarget.value,
                  }))
                }
                rows={3}
              />
              <Button type="submit" loading={createScenario.isPending}>
                Create scenario
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="flex-1">
          {selectedScenarioId ? (
            <ScenarioDetail key={selectedScenarioId} scenarioId={selectedScenarioId} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select a scenario</CardTitle>
                <CardDescription>
                  Choose a scenario on the left or create a new one to begin.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

type ScenarioDetailProps = {
  scenarioId: string;
};

const ScenarioDetail = (props: ScenarioDetailProps) => {
  const trpc = useTRPC();
  const scenarioQuery = useQuery(
    trpc.mock.scenario.byId.queryOptions(
      { scenarioId: props.scenarioId },
      {
        enabled: Boolean(props.scenarioId),
      },
    ),
  );
  const scenario = scenarioQuery.data ?? null;
  const { refetch: refetchScenario, isPending: isScenarioPending } = scenarioQuery;
  const [interactionForm, setInteractionForm] = useState<InteractionFormState>(
    defaultInteractionForm,
  );
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    setIsChatOpen(false);
  }, [props.scenarioId]);

  const createInteraction = useMutation({
    ...trpc.mock.interaction.create.mutationOptions(),
    onSuccess: () => {
      void refetchScenario();
      toast.success("Mock interaction saved");
      setInteractionForm(defaultInteractionForm);
    },
    onError: () => {
      toast.error("Failed to save interaction");
    },
  });

  const deleteInteraction = useMutation({
    ...trpc.mock.interaction.delete.mutationOptions(),
    onSuccess: () => {
      void refetchScenario();
      toast.success("Interaction deleted");
    },
    onError: () => {
      toast.error("Failed to delete interaction");
    },
  });

  const handleCreateInteraction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!scenario) {
      toast.error("Scenario not ready");
      return;
    }

    const title = interactionForm.title.trim();
    const userMessage = interactionForm.userMessage.trim();
    const assistantMessage = interactionForm.assistantMessage.trim();

    if (!title.length || !userMessage.length || !assistantMessage.length) {
      toast.error("Title, user message, and assistant message are required");
      return;
    }

    let toolCalls: {
      toolName: string;
      callId?: string;
      arguments?: JsonValue | null;
      result?: JsonValue | null;
    }[] = [];

    if (interactionForm.toolCallsJson.trim().length) {
      try {
        const parsed = JSON.parse(interactionForm.toolCallsJson) as unknown;
        if (!Array.isArray(parsed)) {
          throw new Error("Tool calls must be an array");
        }

        toolCalls = parsed.map((item, index) => {
          if (!isToolCallDraft(item)) {
            throw new Error(`Invalid tool call at index ${index}`);
          }

          const rawName = typeof item.toolName === "string" ? item.toolName : String(item.toolName);
          const toolName = rawName.trim();
          if (!toolName.length) {
            throw new Error(`Tool name missing at index ${index}`);
          }

          const toolCall: {
            toolName: string;
            callId?: string;
            arguments?: JsonValue | null;
            result?: JsonValue | null;
          } = {
            toolName,
          };

          if (typeof item.callId === "string" && item.callId.trim().length > 0) {
            toolCall.callId = item.callId;
          }

          if ("arguments" in item) {
            toolCall.arguments = normalizeJsonishClient(item.arguments);
          }

          if ("result" in item) {
            toolCall.result = normalizeJsonishClient(item.result);
          }

          return toolCall;
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to parse tool calls JSON",
        );
        return;
      }
    }

    createInteraction.mutate({
      scenarioId: scenario.id,
      title,
      description: interactionForm.description.trim() || undefined,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
        {
          role: "assistant",
          content: assistantMessage,
          toolCalls,
        },
      ],
    });
  };

  const handleDeleteInteraction = (interactionId: string) => {
    deleteInteraction.mutate({ interactionId });
  };

  if (isScenarioPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading scenario…</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!scenario) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scenario unavailable</CardTitle>
          <CardDescription>
            Something went wrong while fetching the scenario. Try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>{scenario.name}</CardTitle>
            <CardDescription>
              Use this scenario ID with your LLM client to retrieve deterministic responses.
            </CardDescription>
          </div>
          <Drawer
            open={isChatOpen}
            onOpenChange={setIsChatOpen}
            direction="right"
          >
            <DrawerTrigger asChild>
              <Button size="sm" variant="secondary">
                Chat with mock
              </Button>
            </DrawerTrigger>
            <MockChatDrawerContent scenario={scenario} />
          </Drawer>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div>
            <span className="font-semibold">Scenario ID:</span>
            <code className="ml-2 rounded bg-muted px-2 py-1 text-xs">
              {scenario.publicId}
            </code>
          </div>
          {scenario.description ? (
            <p className="text-muted-foreground">{scenario.description}</p>
          ) : null}
          <div>
            <p className="font-semibold">API usage example</p>
            <pre className="mt-1 overflow-x-auto rounded bg-muted px-3 py-2 text-xs">
{`await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    scenarioId: "${scenario.publicId}",
    messages: [
      { role: "user", content: "..." }
    ]
  }),
});`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add interaction</CardTitle>
          <CardDescription>
            Define an expected conversation transcript and optional tool call payloads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={handleCreateInteraction}>
            <Input
              placeholder="Interaction title"
              value={interactionForm.title}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setInteractionForm((state) => ({
                  ...state,
                  title: event.currentTarget.value,
                }))
              }
              required
            />
            <Textarea
              placeholder="Optional description"
              value={interactionForm.description}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setInteractionForm((state) => ({
                  ...state,
                  description: event.currentTarget.value,
                }))
              }
              rows={2}
            />
            <Textarea
              placeholder="User message"
              value={interactionForm.userMessage}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setInteractionForm((state) => ({
                  ...state,
                  userMessage: event.currentTarget.value,
                }))
              }
              rows={4}
              required
            />
            <Textarea
              placeholder="Assistant message"
              value={interactionForm.assistantMessage}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setInteractionForm((state) => ({
                  ...state,
                  assistantMessage: event.currentTarget.value,
                }))
              }
              rows={4}
              required
            />
            <Textarea
              placeholder='Optional tool calls JSON (e.g. [{"toolName":"search","arguments":{"query":"docs"},"result":{"items":[]}}])'
              value={interactionForm.toolCallsJson}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setInteractionForm((state) => ({
                  ...state,
                  toolCallsJson: event.currentTarget.value,
                }))
              }
              rows={5}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={createInteraction.isPending}>
                Save interaction
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {scenario.interactions.map((interaction) => (
          <Card key={interaction.id} className="flex flex-col">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{interaction.title}</CardTitle>
                  {interaction.description ? (
                    <CardDescription>{interaction.description}</CardDescription>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteInteraction(interaction.id)}
                  loading={deleteInteraction.isPending}
                >
                  Remove
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Matching sample:</span>
                <span className="rounded bg-muted px-2 py-1">{interaction.matchingInput}</span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              {interaction.messages.map((message) => (
                <div key={message.id} className="rounded border border-border p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <Badge variant="outline">{message.role}</Badge>
                    {message.toolCalls.length ? (
                      <span className="text-xs text-muted-foreground">
                        {message.toolCalls.length} tool call(s)
                      </span>
                    ) : null}
                  </div>
                  {renderContent(message.content)}
                  {message.toolCalls.length ? (
                    <div className="mt-2 space-y-2">
                      {message.toolCalls.map((toolCall) => (
                        <div
                          key={toolCall.id}
                          className="rounded bg-muted/60 p-2 text-xs text-muted-foreground"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{toolCall.toolName}</span>
                            <code className="rounded bg-background px-1 py-0.5">
                              {toolCall.callId}
                            </code>
                          </div>
                          {toolCall.arguments !== null && toolCall.arguments !== undefined ? (
                            <div className="mt-1">
                              <span className="font-semibold">Args:</span>
                              <pre className="mt-1 max-h-32 overflow-auto rounded bg-background px-2 py-1">
                                {JSON.stringify(toolCall.arguments, null, 2)}
                              </pre>
                            </div>
                          ) : null}
                          {toolCall.result !== null && toolCall.result !== undefined ? (
                            <div className="mt-1">
                              <span className="font-semibold">Result:</span>
                              <pre className="mt-1 max-h-32 overflow-auto rounded bg-background px-2 py-1">
                                {JSON.stringify(toolCall.result, null, 2)}
                              </pre>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {!scenario.interactions.length ? (
          <Card className="md:col-span-2">
            <CardContent className="py-10 text-center text-muted-foreground">
              No interactions yet. Create one to start streaming mocked responses.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

type MockChatDrawerContentProps = {
  scenario: NonNullable<ScenarioDetail>;
};

const MockChatDrawerContent = ({ scenario }: MockChatDrawerContentProps) => {
  const [input, setInput] = useState("");
  const [inputVersion, setInputVersion] = useState(0);
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

  const handleFinish = useCallback((event: { message: UIMessage }) => {
    const metadata = event.message.metadata;

    if (metadata && typeof metadata === "object") {
      setMessageMetadata(metadata as MatchingData);
    } else {
      setMessageMetadata(null);
    }
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ body }) => ({
          body: {
            ...(body ?? {}),
            scenarioId: scenario.publicId,
          },
        }),
      }),
    [scenario.publicId],
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

  const { messages, sendMessage, status, error, setMessages, stop, clearError } = useChat({
    chat,
  });

  useEffect(() => {
    setMessages([]);
    setDataParts({});
    setMessageMetadata(null);
    setInput("");
    setClientError(null);
    clearError();
    setInputVersion((value) => value + 1);
  }, [scenario.id, setMessages, clearError]);

  useEffect(() => {
    if (status === "submitted") {
      setDataParts({});
      setMessageMetadata(null);
    }
  }, [status]);

  const handlePromptSubmit = useCallback(
    async (
      message: { text?: string },
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      const trimmedInput = message.text?.trim() ?? "";

      if (!trimmedInput.length) {
        setClientError("Enter a message to start chatting.");
        return;
      }

      setClientError(null);

      try {
        await sendMessage({ text: trimmedInput });
        setInput("");
        setInputVersion((value) => value + 1);
      } catch (cause) {
        const errorMessage =
          cause instanceof Error ? cause.message : "Unknown error";
        setClientError(errorMessage);
      }
    },
    [sendMessage],
  );

  const handleReset = useCallback(() => {
    void stop();
    setMessages([]);
    setDataParts({});
    setMessageMetadata(null);
    setClientError(null);
    setInput("");
    clearError();
    setInputVersion((value) => value + 1);
  }, [stop, setMessages, clearError]);

  const dismissError = useCallback(() => {
    clearError();
    setClientError(null);
  }, [clearError]);

  const isBusy = status === "submitted" || status === "streaming";

  const matching = useMemo(
    () =>
      Object.entries(dataParts).reduce<MatchingData | null>((acc, [key, value]) => {
        if (!key.startsWith("matching")) {
          return acc;
        }

        const next = { ...(acc ?? {}) };

        if (isRecord(value)) {
          Object.assign(next, value);
        } else {
          next[key] = value;
        }

        return next;
      }, null),
    [dataParts],
  );

  const activeMetadata = messageMetadata ?? matching;
  const similarityValue =
    typeof activeMetadata?.similarity === "number" ? activeMetadata.similarity : null;
  const matchedTitle =
    typeof activeMetadata?.title === "string" ? activeMetadata.title : null;
  const matchedScenarioName =
    typeof activeMetadata?.scenario === "string" ? activeMetadata.scenario : null;
  const matchedInteractionId =
    typeof activeMetadata?.interactionId === "string"
      ? activeMetadata.interactionId
      : typeof activeMetadata?.interactionID === "string"
        ? activeMetadata.interactionID
        : null;

  const chatErrorMessage = error instanceof Error ? error.message : null;
  const hasChatError = Boolean(error);

  return (
    <DrawerContent className="flex h-full w-full flex-col bg-background/95 sm:max-w-xl">
      <DrawerHeader className="border-b bg-background/80">
        <DrawerTitle>Chat with {scenario.name}</DrawerTitle>
        <DrawerDescription>
          Send prompts to preview responses returned by your saved interactions.
        </DrawerDescription>
      </DrawerHeader>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
          <span className="font-mono text-[11px] tracking-wide">
            Scenario ID: {scenario.publicId}
          </span>
          <Button onClick={handleReset} size="sm" variant="ghost">
            Reset chat
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Conversation>
            <ConversationContent>
              {messages.length ? (
                messages.map((message) => {
                  const textContent = renderMessageText(message);
                  const rawParts: unknown = (message as { parts?: unknown }).parts;
                  const parts = Array.isArray(rawParts) ? rawParts : [];
                  const toolParts = parts.filter(
                    (part): part is ToolLikeUIPart =>
                      isToolOrDynamicToolUIPart(
                        part as Parameters<typeof isToolOrDynamicToolUIPart>[0],
                      ),
                  );

                  const avatarLabel =
                    message.role === "user"
                      ? "You"
                      : message.role === "assistant"
                        ? scenario.name || "Assistant"
                        : message.role.charAt(0).toUpperCase() + message.role.slice(1);

                  return (
                    <Message key={message.id} from={message.role}>
                      <MessageAvatar name={avatarLabel} src="" />
                      <MessageContent>
                        {textContent ? <Response>{textContent}</Response> : null}
                        {toolParts.length ? (
                          <div className="mt-3 space-y-3">
                            {toolParts.map((part) => {
                              const toolState = normalizeToolState(part.state);
                              const toolName = getToolOrDynamicToolName(part);
                              const toolType =
                                part.type === "dynamic-tool"
                                  ? `tool-${toolName}`
                                  : part.type;

                              return (
                                <Tool
                                  key={part.toolCallId}
                                  defaultOpen={
                                    toolState === "output-available" ||
                                    toolState === "output-error"
                                  }
                                >
                                  <ToolHeader
                                    title={toolName}
                                    type={toolType}
                                    state={toolState}
                                  />
                                  <ToolContent>
                                    {part.input !== undefined ? (
                                      <ToolInput input={part.input} />
                                    ) : null}
                                    {part.output !== undefined || part.errorText ? (
                                      <ToolOutput
                                        output={part.output}
                                        errorText={part.errorText}
                                      />
                                    ) : null}
                                  </ToolContent>
                                </Tool>
                              );
                            })}
                          </div>
                        ) : null}
                      </MessageContent>
                    </Message>
                  );
                })
              ) : (
                <ConversationEmptyState description="Send a message to test mocked responses for this scenario." />
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>
        {activeMetadata ? (
          <div className="border-t bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                Matched {matchedTitle ? `"${matchedTitle}"` : "mock interaction"}
                {matchedScenarioName ? ` in ${matchedScenarioName}` : null}
              </div>
              {similarityValue !== null ? (
                <span className="font-semibold text-foreground">
                  {formatSimilarity(similarityValue)}
                </span>
              ) : null}
            </div>
            {matchedInteractionId ? (
              <div className="font-mono text-[11px]">
                Interaction ID: {matchedInteractionId}
              </div>
            ) : null}
          </div>
        ) : null}
        {hasChatError ? (
          <div className="border-t border-destructive/40 bg-destructive/15 px-4 py-2 text-xs text-destructive">
            <div className="flex items-center justify-between gap-2">
              <span>{chatErrorMessage ?? "An unexpected error occurred."}</span>
              <Button onClick={dismissError} size="sm" variant="ghost">
                Dismiss
              </Button>
            </div>
          </div>
        ) : null}
        <div className="border-t bg-background px-4 py-3">
          <PromptInput
            key={inputVersion}
            className="border-none px-0 shadow-none"
            onError={(error) => {
              const nextMessage =
                typeof error === "object" &&
                "message" in error &&
                typeof (error as { message?: unknown }).message === "string"
                  ? (error as { message: string }).message
                  : "Unable to process attachments.";
              setClientError(nextMessage);
            }}
            onSubmit={handlePromptSubmit}
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Ask the mock assistant..."
                value={input}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                  setInput(event.currentTarget.value);
                  setClientError(null);
                }}
              />
            </PromptInputBody>
            <PromptInputToolbar>
              <PromptInputTools />
              <div className="flex items-center gap-2">
                {status === "streaming" ? (
                  <PromptInputButton
                    aria-label="Stop response"
                    onClick={() => {
                      void stop();
                    }}
                    variant="ghost"
                  >
                    <Square className="h-4 w-4" />
                  </PromptInputButton>
                ) : null}
                <PromptInputSubmit
                  disabled={isBusy || !input.trim().length}
                  status={status}
                />
              </div>
            </PromptInputToolbar>
          </PromptInput>
          {clientError ? (
            <p className="mt-2 text-xs text-destructive">{clientError}</p>
          ) : null}
        </div>
      </div>
    </DrawerContent>
  );
};

const renderMessageText = (message: UIMessage) => {
  const rawParts: unknown = (message as { parts?: unknown }).parts;
  const parts = Array.isArray(rawParts) ? rawParts : [];

  const textParts = parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (textParts.length) {
    return textParts;
  }

  return parts
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (isTextUIPart(part)) {
        return part.text;
      }

    if (
      isToolOrDynamicToolUIPart(
        part as Parameters<typeof isToolOrDynamicToolUIPart>[0],
      )
    ) {
      return "";
    }

      if (isRecord(part)) {
        const maybeText = (part as { text?: unknown }).text;
        if (typeof maybeText === "string") {
          return maybeText;
        }
      }

      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
};

const formatSimilarity = (value: number) => `${(value * 100).toFixed(1)}%`;

const normalizeToolState = (value: unknown): ToolUIPart["state"] => {
  switch (value) {
    case "input-streaming":
    case "input-available":
    case "output-available":
    case "output-error":
      return value;
    default:
      return "output-available";
  }
};

const isTextUIPart = (part: unknown): part is TextUIPart => {
  if (!isRecord(part)) {
    return false;
  }

  const { type, text } = part as { type?: unknown; text?: unknown };

  return type === "text" && typeof text === "string";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isToolCallDraft = (value: unknown): value is ToolCallDraft =>
  isRecord(value) && "toolName" in value;

const renderContent = (content: unknown) => {
  if (typeof content === "string") {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  if (Array.isArray(content)) {
    return (
      <div className="space-y-1">
        {content.map((part, index) => {
          if (typeof part === "string") {
            return (
              <p key={index} className="whitespace-pre-wrap">
                {part}
              </p>
            );
          }

          if (isRecord(part)) {
            const text = part.text;
            if (typeof text === "string") {
              return (
                <p key={index} className="whitespace-pre-wrap">
                  {text}
                </p>
              );
            }
          }

          return (
            <p key={index} className="whitespace-pre-wrap">
              {JSON.stringify(part)}
            </p>
          );
        })}
      </div>
    );
  }

  if (isRecord(content)) {
    return (
      <pre className="max-h-48 overflow-auto rounded bg-muted px-2 py-1 text-xs">
        {JSON.stringify(content, null, 2)}
      </pre>
    );
  }

  return null;
};

const normalizeJsonishClient = (value: unknown): JsonValue | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return null;
    }

    try {
      return JSON.parse(trimmed) as JsonValue;
    } catch {
      return trimmed;
    }
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonishClient(entry) ?? null);
  }

  if (isRecord(value)) {
    const record: Record<string, JsonValue> = {};
    for (const [key, entry] of Object.entries(value)) {
      record[key] = normalizeJsonishClient(entry) ?? null;
    }
    return record;
  }

  return null;
};
