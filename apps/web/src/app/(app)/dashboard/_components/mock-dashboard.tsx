"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { toast } from "@repo/ui/components/sonner";
import { cn } from "@repo/ui/lib/utils";
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "@repo/api";
import { useTRPC } from "@/trpc/react";
import { CollectionSettings } from "./collection-settings";
import { EndpointCard } from "./endpoint-card";
import { InteractionForm } from "./interaction-form";
import { InteractionsTable } from "./interactions-table";

const emptyCollectionList: RouterOutputs["collection"]["list"] = [];

export const MockDashboard = () => {
  const trpc = useTRPC();
  const collectionListQuery = useQuery(trpc.collection.list.queryOptions(undefined));
  const collections = collectionListQuery.data ?? emptyCollectionList;
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!collections.length) {
      setSelectedCollectionId(null);
      return;
    }

    const selectionExists = collections.some(
      (collection) => collection.id === selectedCollectionId,
    );

    if (!selectionExists) {
      setSelectedCollectionId(collections[0]?.id ?? null);
    }
  }, [collections, selectedCollectionId]);

  const selectedCollectionQuery = useQuery(
    trpc.collection.byId.queryOptions(
      selectedCollectionId ? { collectionId: selectedCollectionId } : skipToken,
    ),
  );
  const collection = selectedCollectionQuery.data;

  if (collectionListQuery.isPending) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (collectionListQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Failed to load collections</CardTitle>
          <CardDescription>{collectionListQuery.error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void collectionListQuery.refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (!collections.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create your first collection</CardTitle>
          <CardDescription>
            A collection groups the mock interactions behind a single endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateCollectionForm onCreated={setSelectedCollectionId} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-64">
        <div className="flex items-center justify-between gap-2 pb-3">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Collections
          </h2>
          <CreateCollectionDialog onCreated={setSelectedCollectionId} />
        </div>
        <nav className="flex flex-col gap-1">
          {collections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedCollectionId(item.id)}
              className={cn(
                "hover:bg-muted flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                item.id === selectedCollectionId && "bg-muted font-medium",
              )}
            >
              <span className="truncate">{item.name ?? "Untitled"}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {item.isPublic ? (
                  <Badge variant="outline" className="px-1.5 py-0 text-[0.65rem]">
                    Public
                  </Badge>
                ) : null}
                <span className="text-muted-foreground text-xs tabular-nums">
                  {item.interactionCount}
                </span>
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        {collection ? (
          <div className="flex flex-col gap-4">
            <CollectionSettings
              key={collection.id}
              collection={collection}
              onDeleted={() => setSelectedCollectionId(null)}
            />
            <EndpointCard publicId={collection.publicId} isPublic={collection.isPublic} />
            <InteractionForm collectionId={collection.id} />
            <InteractionsTable interactions={collection.interactions} />
          </div>
        ) : (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        )}
      </div>
    </div>
  );
};

type CreateCollectionFormProps = {
  onCreated: (collectionId: string) => void;
};

const CreateCollectionForm = ({ onCreated }: CreateCollectionFormProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "" });

  const createCollection = useMutation({
    ...trpc.collection.create.mutationOptions(),
    onSuccess: (data) => {
      void queryClient.invalidateQueries(trpc.collection.list.queryFilter());
      setForm({ name: "", description: "" });
      toast.success("Collection created");
      onCreated(data.id);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create collection");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();

    if (!name.length) {
      toast.error("Collection name is required");
      return;
    }

    createCollection.mutate({
      name,
      description: form.description.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="new-collection-name">Collection name</Label>
        <Input
          id="new-collection-name"
          placeholder="My new collection"
          value={form.name}
          onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="new-collection-description">Description (optional)</Label>
        <Textarea
          id="new-collection-description"
          placeholder="A brief description of what this collection does."
          value={form.description}
          onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))}
          rows={3}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={createCollection.isPending}>
          Create collection
        </Button>
      </div>
    </form>
  );
};

const CreateCollectionDialog = ({ onCreated }: CreateCollectionFormProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>New</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
          <DialogDescription>
            A collection groups the mock interactions behind a single endpoint.
          </DialogDescription>
        </DialogHeader>
        <CreateCollectionForm
          onCreated={(collectionId) => {
            setOpen(false);
            onCreated(collectionId);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
