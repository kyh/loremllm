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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";
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

type CollectionList = RouterOutputs["collection"]["list"];

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

const formatOutputToHtml = (content: string) =>
  content
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(
      /`(.*?)`/g,
      '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>',
    )
    .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold mt-4 mb-2">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-base font-semibold mt-3 mb-2">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-sm font-medium mt-2 mb-1">$1</h3>')
    .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/^(?!<[h|l])/gm, '<p class="mb-2">')
    .replace(/(<li.*<\/li>)/gs, '<ul class="list-disc ml-4 mb-2">$1</ul>');

export const MockDashboard = () => {
  const trpc = useTRPC();
  const collectionListQuery = useQuery(
    trpc.collection.list.queryOptions(undefined),
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
    ...trpc.collection.create.mutationOptions(),
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
    ...trpc.collection.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Collection updated");
    },
    onError: () => {
      toast.error("Failed to update collection");
    },
  });

  const deleteCollection = useMutation({
    ...trpc.collection.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Collection deleted");
      setSelectedCollectionId(null);
    },
    onError: () => {
      toast.error("Failed to delete collection");
    },
  });

  const selectedCollectionQuery = useQuery(
    trpc.collection.byId.queryOptions(
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
    ...trpc.interaction.create.mutationOptions(),
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
    ...trpc.interaction.delete.mutationOptions(),
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
          <form
            onSubmit={handleCreateCollection}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div className="grid gap-1.5">
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
            <div className="grid gap-1.5 sm:col-span-2">
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
                rows={3}
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={createCollection.isPending}>
                Create collection
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{collection.name}</CardTitle>
            {collection.description ? (
              <CardDescription>{collection.description}</CardDescription>
            ) : null}
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              <span>Public ID:</span>
              <span className="bg-muted rounded px-2 py-1 font-mono">
                {collection.publicId}
              </span>
            </div>
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
              disabled={deleteCollection.isPending}
            >
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleUpdateCollection}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div className="grid gap-1.5">
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
            <div className="grid gap-1.5 sm:col-span-2">
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
                rows={3}
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={updateCollection.isPending}>
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
          <form
            onSubmit={handleCreateInteraction}
            className="grid gap-3 md:grid-cols-2"
          >
            <div className="grid gap-1.5">
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
            <div className="grid gap-1.5">
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
                rows={3}
              />
            </div>
            <div className="grid gap-1.5 md:col-span-1">
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
                The user input matched using semantic search.
              </p>
            </div>
            <div className="grid gap-1.5 md:col-span-1">
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
                rows={5}
                required
              />
              <p className="text-muted-foreground text-xs">
                Supports markdown formatting for richer answers.
              </p>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={createInteraction.isPending}>
                Save mock response
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mock responses</CardTitle>
          <CardDescription>
            Review inputs and generated outputs in a spreadsheet-style table.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {collection.interactions.length ? (
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[16rem]">Interaction</TableHead>
                  <TableHead className="min-w-[18rem]">Input</TableHead>
                  <TableHead className="min-w-[24rem]">Response</TableHead>
                  <TableHead className="w-[1%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collection.interactions.map((interaction) => (
                  <TableRow key={interaction.id}>
                    <TableCell className="whitespace-normal align-top">
                      <div className="font-medium leading-6">
                        {interaction.title}
                      </div>
                      {interaction.description ? (
                        <p className="text-muted-foreground mt-1 text-xs leading-5">
                          {interaction.description}
                        </p>
                      ) : null}
                      <div className="text-muted-foreground mt-2 flex items-center gap-2 text-[0.7rem]">
                        <span>Response schema:</span>
                        <span className="rounded bg-muted px-2 py-0.5 font-mono">
                          {interaction.responseSchema}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-pre-wrap align-top text-xs leading-5 text-muted-foreground">
                      {interaction.input}
                    </TableCell>
                    <TableCell className="whitespace-normal align-top">
                      <div className="flex flex-col gap-2">
                        <Badge className="w-fit">
                          Response
                        </Badge>
                        {typeof interaction.output === "string" ? (
                          <div
                            className="prose prose-sm max-w-none whitespace-pre-wrap text-sm"
                            dangerouslySetInnerHTML={{
                              __html: formatOutputToHtml(interaction.output),
                            }}
                          />
                        ) : (
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(interaction.output, null, 2)}
                          </pre>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteInteraction(interaction.id)}
                        disabled={deleteInteraction.isPending}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground py-10 text-center text-sm">
              No interactions yet. Create one to start streaming mocked
              responses.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
