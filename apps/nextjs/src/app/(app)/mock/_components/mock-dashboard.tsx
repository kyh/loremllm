"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { toast } from "@repo/ui/toast";
import { cn } from "@repo/ui/utils";
import { useMutation, useQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@repo/api";
import type { JsonValue } from "@repo/api/mock/mock-schema";
import { useTRPC } from "@/trpc/react";
import { ScenarioChatDrawer } from "./scenario-chat-drawer";

type ScenarioFormState = {
  name: string;
  description: string;
};

type ToolCallFormState = {
  id: string;
  toolName: string;
  callId: string;
  arguments: string;
  result: string;
};

type InteractionFormState = {
  title: string;
  description: string;
  userMessage: string;
  assistantResponse: string;
  toolCalls: ToolCallFormState[];
};

type ScenarioList = RouterOutputs["mock"]["scenario"]["list"];
type ScenarioDetail = RouterOutputs["mock"]["scenario"]["byId"];

const emptyScenarioList: ScenarioList = [];

const defaultScenarioForm: ScenarioFormState = { name: "", description: "" };

const createToolCallFormState = (): ToolCallFormState => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  toolName: "",
  callId: "",
  arguments: "",
  result: "",
});

const createDefaultInteractionForm = (): InteractionFormState => ({
  title: "",
  description: "",
  userMessage: "",
  assistantResponse: "",
  toolCalls: [],
});

export const MockDashboard = () => {
  const trpc = useTRPC();
  const scenarioListQuery = useQuery(
    trpc.mock.scenario.list.queryOptions(undefined),
  );
  const scenarios = scenarioListQuery.data ?? emptyScenarioList;
  const { refetch: refetchScenarios, isPending: isFetchingScenarios } =
    scenarioListQuery;
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );
  const [scenarioForm, setScenarioForm] =
    useState<ScenarioFormState>(defaultScenarioForm);

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
        ? (scenarios.find(
            (scenarioItem) => scenarioItem.id === selectedScenarioId,
          ) ?? null)
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
                    <Badge variant="secondary">
                      {scenario.interactionCount} mocks
                    </Badge>
                  </div>
                  {scenario.description ? (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {scenario.description}
                    </p>
                  ) : null}
                </button>
              ))}
              {!isFetchingScenarios && !scenarios.length ? (
                <p className="border-border text-muted-foreground rounded border border-dashed px-3 py-4 text-sm">
                  Create a scenario to start mocking responses.
                </p>
              ) : null}
            </div>
            {selectedScenario ? (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive justify-start text-sm"
                disabled={deleteScenario.isPending}
                onClick={() => handleDeleteScenario(selectedScenario.id)}
              >
                Delete selected
              </Button>
            ) : null}
            <form
              className="flex flex-col gap-2"
              onSubmit={handleCreateScenario}
            >
              <h3 className="font-semibold">New scenario</h3>
              <Input
                placeholder="Scenario name"
                value={scenarioForm.name}
                onChange={(event) =>
                  setScenarioForm((state) => ({
                    ...state,
                    name: event.target.value,
                  }))
                }
                required
              />
              <Textarea
                placeholder="Optional description"
                value={scenarioForm.description}
                onChange={(event) =>
                  setScenarioForm((state) => ({
                    ...state,
                    description: event.target.value,
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
            <ScenarioDetail
              key={selectedScenarioId}
              scenarioId={selectedScenarioId}
            />
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
  const { refetch: refetchScenario, isPending: isScenarioPending } =
    scenarioQuery;
  const [interactionForm, setInteractionForm] = useState<InteractionFormState>(
    createDefaultInteractionForm,
  );

  const createInteraction = useMutation({
    ...trpc.mock.interaction.create.mutationOptions(),
    onSuccess: () => {
      void refetchScenario();
      toast.success("Mock interaction saved");
      setInteractionForm(createDefaultInteractionForm());
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
    const assistantResponse = interactionForm.assistantResponse.trim();

    if (!title.length || !userMessage.length || !assistantResponse.length) {
      toast.error("Title, user input, and response are required");
      return;
    }

    const toolCalls: {
      toolName: string;
      callId?: string;
      arguments?: JsonValue | null;
      result?: JsonValue | null;
    }[] = [];

    for (let index = 0; index < interactionForm.toolCalls.length; index += 1) {
      const draft = interactionForm.toolCalls[index];

      if (!draft) {
        continue;
      }

      const toolName = draft.toolName.trim();
      const callId = draft.callId.trim();
      const argumentsText = draft.arguments.trim();
      const resultText = draft.result.trim();

      const hasContent =
        toolName.length ||
        callId.length ||
        argumentsText.length ||
        resultText.length;

      if (!hasContent) {
        continue;
      }

      if (!toolName.length) {
        toast.error(`Tool call ${index + 1} is missing a tool name`);
        return;
      }

      const toolCall: {
        toolName: string;
        callId?: string;
        arguments?: JsonValue | null;
        result?: JsonValue | null;
      } = {
        toolName,
      };

      if (callId.length) {
        toolCall.callId = callId;
      }

      try {
        if (argumentsText.length) {
          const parsedArguments = parseToolCallValue(
            argumentsText,
            `tool call ${index + 1} arguments`,
          );
          toolCall.arguments = parsedArguments;
        }

        if (resultText.length) {
          const parsedResult = parseToolCallValue(
            resultText,
            `tool call ${index + 1} result`,
          );
          toolCall.result = parsedResult;
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to parse tool call payload",
        );
        return;
      }

      toolCalls.push(toolCall);
    }

    createInteraction.mutate({
      scenarioId: scenario.id,
      title,
      description: interactionForm.description.trim() || undefined,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userMessage,
            },
          ],
        },
        {
          role: "assistant",
          content: [
            {
              type: "text",
              text: assistantResponse,
            },
          ],
          toolCalls,
        },
      ],
    });
  };

  const handleAddToolCall = () => {
    setInteractionForm((state) => ({
      ...state,
      toolCalls: [...state.toolCalls, createToolCallFormState()],
    }));
  };

  const handleRemoveToolCall = (id: string) => {
    setInteractionForm((state) => ({
      ...state,
      toolCalls: state.toolCalls.filter((toolCall) => toolCall.id !== id),
    }));
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
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <CardTitle>{scenario.name}</CardTitle>
            <CardDescription>
              Use this scenario ID with your LLM client to retrieve
              deterministic responses.
            </CardDescription>
          </div>
          <ScenarioChatDrawer
            scenarioId={scenario.publicId}
            scenarioName={scenario.name}
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div>
            <span className="font-semibold">Scenario ID:</span>
            <code className="bg-muted ml-2 rounded px-2 py-1 text-xs">
              {scenario.publicId}
            </code>
          </div>
          {scenario.description ? (
            <p className="text-muted-foreground">{scenario.description}</p>
          ) : null}
          <div>
            <p className="font-semibold">API usage example</p>
            <pre className="bg-muted mt-1 overflow-x-auto rounded px-3 py-2 text-xs">
              {`import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const transport = new DefaultChatTransport({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ body }) => ({
    body: {
      ...body,
      scenarioId: "${scenario.publicId}",
    },
  }),
});

const chat = new Chat({ transport });

await chat.sendMessage({ text: "..." });`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add mock response</CardTitle>
          <CardDescription>
            Define how the assistant should reply when it receives a matching
            message.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleCreateInteraction}
          >
            <div className="grid gap-2">
              <Label htmlFor="interaction-title">Mock name</Label>
              <Input
                id="interaction-title"
                placeholder="Weather update"
                value={interactionForm.title}
                onChange={(event) =>
                  setInteractionForm((state) => ({
                    ...state,
                    title: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interaction-description">
                Description (optional)
              </Label>
              <Textarea
                id="interaction-description"
                placeholder="Short summary for your teammates"
                value={interactionForm.description}
                onChange={(event) =>
                  setInteractionForm((state) => ({
                    ...state,
                    description: event.target.value,
                  }))
                }
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interaction-user">If the user says&hellip;</Label>
              <Textarea
                id="interaction-user"
                placeholder="What's the weather like in San Francisco?"
                value={interactionForm.userMessage}
                onChange={(event) =>
                  setInteractionForm((state) => ({
                    ...state,
                    userMessage: event.target.value,
                  }))
                }
                rows={4}
                required
              />
              <p className="text-muted-foreground text-xs">
                We&apos;ll match incoming requests against this message.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interaction-response">Respond with&hellip;</Label>
              <Textarea
                id="interaction-response"
                placeholder="It's 72°F and sunny along the bay."
                value={interactionForm.assistantResponse}
                onChange={(event) =>
                  setInteractionForm((state) => ({
                    ...state,
                    assistantResponse: event.target.value,
                  }))
                }
                rows={4}
                required
              />
              <p className="text-muted-foreground text-xs">
                We&apos;ll convert this to a UI message payload for you.
              </p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Tool calls (optional)</p>
                <p className="text-muted-foreground text-sm">
                  Provide any tool activity that should happen before the
                  assistant reply.
                </p>
              </div>
              {interactionForm.toolCalls.map((toolCall, index) => (
                <div
                  key={toolCall.id}
                  className="border-border/70 space-y-3 rounded-md border border-dashed p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Tool call {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveToolCall(toolCall.id)}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor={`tool-${toolCall.id}-name`}>
                        Tool name
                      </Label>
                      <Input
                        id={`tool-${toolCall.id}-name`}
                        placeholder="search"
                        value={toolCall.toolName}
                        onChange={(event) =>
                          setInteractionForm((state) => ({
                            ...state,
                            toolCalls: state.toolCalls.map((item) =>
                              item.id === toolCall.id
                                ? { ...item, toolName: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor={`tool-${toolCall.id}-call-id`}>
                        Call ID (optional)
                      </Label>
                      <Input
                        id={`tool-${toolCall.id}-call-id`}
                        placeholder="call_123"
                        value={toolCall.callId}
                        onChange={(event) =>
                          setInteractionForm((state) => ({
                            ...state,
                            toolCalls: state.toolCalls.map((item) =>
                              item.id === toolCall.id
                                ? { ...item, callId: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`tool-${toolCall.id}-arguments`}>
                      Arguments JSON (optional)
                    </Label>
                    <Textarea
                      id={`tool-${toolCall.id}-arguments`}
                      placeholder='{"query":"docs"}'
                      value={toolCall.arguments}
                      onChange={(event) =>
                        setInteractionForm((state) => ({
                          ...state,
                          toolCalls: state.toolCalls.map((item) =>
                            item.id === toolCall.id
                              ? { ...item, arguments: event.target.value }
                              : item,
                          ),
                        }))
                      }
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`tool-${toolCall.id}-result`}>
                      Result JSON (optional)
                    </Label>
                    <Textarea
                      id={`tool-${toolCall.id}-result`}
                      placeholder='{"items":[]}'
                      value={toolCall.result}
                      onChange={(event) =>
                        setInteractionForm((state) => ({
                          ...state,
                          toolCalls: state.toolCalls.map((item) =>
                            item.id === toolCall.id
                              ? { ...item, result: event.target.value }
                              : item,
                          ),
                        }))
                      }
                      rows={3}
                    />
                    <p className="text-muted-foreground text-xs">
                      Strings should be wrapped in quotes to be valid JSON.
                    </p>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddToolCall}
              >
                Add tool call
              </Button>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={createInteraction.isPending}>
                Save mock response
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
                  <CardTitle className="text-base">
                    {interaction.title}
                  </CardTitle>
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
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                <span>Matching sample:</span>
                <span className="bg-muted rounded px-2 py-1">
                  {interaction.matchingInput}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              {interaction.messages.map((message) => (
                <div
                  key={message.id}
                  className="border-border rounded border p-3 text-sm"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <Badge variant="outline">{message.role}</Badge>
                    {message.toolCalls.length ? (
                      <span className="text-muted-foreground text-xs">
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
                          className="bg-muted/60 text-muted-foreground rounded p-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {toolCall.toolName}
                            </span>
                            <code className="bg-background rounded px-1 py-0.5">
                              {toolCall.callId}
                            </code>
                          </div>
                          {toolCall.arguments !== null &&
                          toolCall.arguments !== undefined ? (
                            <div className="mt-1">
                              <span className="font-semibold">Args:</span>
                              <pre className="bg-background mt-1 max-h-32 overflow-auto rounded px-2 py-1">
                                {JSON.stringify(toolCall.arguments, null, 2)}
                              </pre>
                            </div>
                          ) : null}
                          {toolCall.result !== null &&
                          toolCall.result !== undefined ? (
                            <div className="mt-1">
                              <span className="font-semibold">Result:</span>
                              <pre className="bg-background mt-1 max-h-32 overflow-auto rounded px-2 py-1">
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
            <CardContent className="text-muted-foreground py-10 text-center">
              No interactions yet. Create one to start streaming mocked
              responses.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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
      <pre className="bg-muted max-h-48 overflow-auto rounded px-2 py-1 text-xs">
        {JSON.stringify(content, null, 2)}
      </pre>
    );
  }

  return null;
};

const parseToolCallValue = (
  input: string,
  context: string,
): JsonValue | null => {
  const trimmed = input.trim();

  if (!trimmed.length) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as JsonValue;
  } catch {
    const firstCharacter = trimmed[0];
    if (
      firstCharacter === "{" ||
      firstCharacter === "[" ||
      firstCharacter === '"'
    ) {
      throw new Error(`${context} must be valid JSON`);
    }

    return trimmed;
  }
};
