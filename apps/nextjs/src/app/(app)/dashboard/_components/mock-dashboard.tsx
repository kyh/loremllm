"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
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
import { skipToken, useMutation, useQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@repo/api";
import { useTRPC } from "@/trpc/react";
import { CollectionChatDrawer } from "./collection-chat-drawer";

type CollectionFormState = {
  name: string;
  description: string;
};

type InteractionFormState = {
  title: string;
  description: string;
  input: string;
  output: string;
};

type CollectionList = RouterOutputs["mock"]["collection"]["list"];

const emptyCollectionList: CollectionList = [];

const defaultCollectionForm: CollectionFormState = {
  name: "",
  description: "",
};

const createDefaultInteractionForm = (): InteractionFormState => ({
  title: "",
  description: "",
  input: "",
  output: "",
});

export const MockDashboard = () => {
  const trpc = useTRPC();
  const collectionListQuery = useQuery(
    trpc.mock.collection.list.queryOptions(undefined),
  );
  const collections = collectionListQuery.data ?? emptyCollectionList;
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
  const [collectionForm, setCollectionForm] = useState<CollectionFormState>(
    defaultCollectionForm,
  );

  useEffect(() => {
    if (!selectedCollectionId && collections.length > 0) {
      setSelectedCollectionId(collections[0]?.id ?? null);
    }
  }, [collections, selectedCollectionId]);

  const createCollection = useMutation({
    ...trpc.mock.collection.create.mutationOptions(),
    onSuccess: (data) => {
      setCollectionForm(defaultCollectionForm);
      setSelectedCollectionId(data.id);
      toast.success("Collection created");
    },
    onError: () => {
      toast.error("Failed to create collection");
    },
  });

  const updateCollection = useMutation({
    ...trpc.mock.collection.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Collection updated");
    },
    onError: () => {
      toast.error("Failed to update collection");
    },
  });

  const deleteCollection = useMutation({
    ...trpc.mock.collection.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Collection deleted");
      setSelectedCollectionId(null);
    },
    onError: () => {
      toast.error("Failed to delete collection");
    },
  });

  const selectedCollectionQuery = useQuery(
    trpc.mock.collection.byId.queryOptions(
      selectedCollectionId ? { collectionId: selectedCollectionId } : skipToken,
    ),
  );
  const collection = selectedCollectionQuery.data;
  const isCollectionPending = selectedCollectionQuery.isPending;
  const refetchCollection = selectedCollectionQuery.refetch;

  useEffect(() => {
    if (collection) {
      setCollectionForm({
        name: collection.name ?? "",
        description: collection.description ?? "",
      });
    }
  }, [collection]);

  const handleCreateCollection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = collectionForm.name.trim();

    if (!name.length) {
      toast.error("Collection name is required");
      return;
    }

    createCollection.mutate({
      name,
      description: collectionForm.description.trim() || undefined,
    });
  };

  const handleUpdateCollection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!collection) {
      toast.error("Collection not ready");
      return;
    }

    const name = collectionForm.name.trim();

    if (!name.length) {
      toast.error("Collection name is required");
      return;
    }

    updateCollection.mutate({
      collectionId: collection.id,
      name,
      description: collectionForm.description.trim() || undefined,
    });
  };

  const [interactionForm, setInteractionForm] = useState<InteractionFormState>(
    createDefaultInteractionForm,
  );

  const createInteraction = useMutation({
    ...trpc.mock.interaction.create.mutationOptions(),
    onSuccess: () => {
      void refetchCollection();
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
      void refetchCollection();
      toast.success("Mock interaction deleted");
    },
    onError: () => {
      toast.error("Failed to delete interaction");
    },
  });

  const handleCreateInteraction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!collection) {
      toast.error("Collection not ready");
      return;
    }

    const title = interactionForm.title.trim();
    const input = interactionForm.input.trim();
    const output = interactionForm.output.trim();

    if (!title.length || !input.length || !output.length) {
      toast.error("Title, input, and output are required");
      return;
    }

    createInteraction.mutate({
      collectionId: collection.id,
      title,
      description: interactionForm.description.trim() || undefined,
      input,
      output,
    });
  };

  const handleDeleteInteraction = (interactionId: string) => {
    deleteInteraction.mutate({ interactionId });
  };

  if (isCollectionPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading collection…</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!collection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No collection selected</CardTitle>
          <CardDescription>
            Create a new collection or select an existing one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateCollection} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="collection-name">Collection name</Label>
              <Input
                id="collection-name"
                placeholder="My new collection"
                value={collectionForm.name}
                onChange={(event) =>
                  setCollectionForm((state) => ({
                    ...state,
                    name: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="collection-description">
                Description (optional)
              </Label>
              <Textarea
                id="collection-description"
                placeholder="A brief description of what this collection does."
                value={collectionForm.description}
                onChange={(event) =>
                  setCollectionForm((state) => ({
                    ...state,
                    description: event.target.value,
                  }))
                }
                rows={2}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={createCollection.isPending}>
                Create collection
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="grid gap-1">
              <CardTitle className="text-base">
                Collection: {collection.name}
              </CardTitle>
              {collection.description ? (
                <CardDescription>{collection.description}</CardDescription>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <CollectionChatDrawer
                collectionId={collection.publicId}
                collectionName={collection.name ?? "Untitled Collection"}
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() =>
                  deleteCollection.mutate({ collectionId: collection.id })
                }
                loading={deleteCollection.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <span>Public ID:</span>
            <span className="bg-muted rounded px-2 py-1">
              {collection.publicId}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateCollection} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="collection-name">Collection name</Label>
              <Input
                id="collection-name"
                placeholder="My new collection"
                value={collectionForm.name}
                onChange={(event) =>
                  setCollectionForm((state) => ({
                    ...state,
                    name: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="collection-description">
                Description (optional)
              </Label>
              <Textarea
                id="collection-description"
                placeholder="A brief description of what this collection does."
                value={collectionForm.description}
                onChange={(event) =>
                  setCollectionForm((state) => ({
                    ...state,
                    description: event.target.value,
                  }))
                }
                rows={2}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={updateCollection.isPending}>
                Update collection
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add new mock response</CardTitle>
          <CardDescription>
            Create a new mock interaction for this collection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateInteraction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="interaction-title">Title</Label>
              <Input
                id="interaction-title"
                placeholder="Weather in San Francisco"
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
                placeholder="A brief description of this mock interaction."
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
              <Label htmlFor="interaction-input">Input (User Query)</Label>
              <Textarea
                id="interaction-input"
                placeholder="What's the weather like in San Francisco?"
                value={interactionForm.input}
                onChange={(event) =>
                  setInteractionForm((state) => ({
                    ...state,
                    input: event.target.value,
                  }))
                }
                rows={4}
                required
              />
              <p className="text-muted-foreground text-xs">
                The user input that will be matched using semantic search.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interaction-output">Output (Response)</Label>
              <Textarea
                id="interaction-output"
                placeholder="It's 72°F and sunny along the bay."
                value={interactionForm.output}
                onChange={(event) =>
                  setInteractionForm((state) => ({
                    ...state,
                    output: event.target.value,
                  }))
                }
                rows={6}
                required
              />
              <p className="text-muted-foreground text-xs">
                The response content. Supports markdown formatting.
              </p>
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
        {collection.interactions.map((interaction) => (
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
                <span>Input:</span>
                <span className="bg-muted rounded px-2 py-1">
                  {interaction.input}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="border-border rounded border p-3 text-sm">
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant="outline">Response</Badge>
                  <span className="text-muted-foreground text-xs">
                    {interaction.responseSchema}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none">
                  {typeof interaction.output === "string" ? (
                    <div
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: interaction.output
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>")
                          .replace(
                            /`(.*?)`/g,
                            '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>',
                          )
                          .replace(
                            /^# (.*$)/gm,
                            '<h1 class="text-lg font-bold mt-4 mb-2">$1</h1>',
                          )
                          .replace(
                            /^## (.*$)/gm,
                            '<h2 class="text-base font-semibold mt-3 mb-2">$1</h2>',
                          )
                          .replace(
                            /^### (.*$)/gm,
                            '<h3 class="text-sm font-medium mt-2 mb-1">$1</h3>',
                          )
                          .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
                          .replace(/^\d+\. (.*$)/gm, '<li class="ml-4">$1</li>')
                          .replace(/\n\n/g, '</p><p class="mb-2">')
                          .replace(/^(?!<[h|l])/gm, '<p class="mb-2">')
                          .replace(
                            /(<li.*<\/li>)/gs,
                            '<ul class="list-disc ml-4 mb-2">$1</ul>',
                          ),
                      }}
                    />
                  ) : (
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(interaction.output, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!collection.interactions.length ? (
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
