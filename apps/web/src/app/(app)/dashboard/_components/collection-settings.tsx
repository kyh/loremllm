"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { alertDialog } from "@repo/ui/components/alert-dialog";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { toast } from "@repo/ui/components/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "@repo/api";
import { useTRPC } from "@/trpc/react";
import { CollectionChatDrawer } from "./collection-chat-drawer";

type Collection = RouterOutputs["collection"]["byId"];

type CollectionSettingsProps = {
  collection: Collection;
  onDeleted: () => void;
};

export const CollectionSettings = ({ collection, onDeleted }: CollectionSettingsProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: collection.name ?? "",
    description: collection.description ?? "",
    minSimilarityPercent: String(Math.round(collection.minSimilarity * 100)),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries(trpc.collection.list.queryFilter());
    void queryClient.invalidateQueries(trpc.collection.byId.queryFilter());
  };

  const updateCollection = useMutation({
    ...trpc.collection.update.mutationOptions(),
    onSuccess: () => {
      invalidate();
      toast.success("Collection updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update collection");
    },
  });

  const deleteCollection = useMutation({
    ...trpc.collection.delete.mutationOptions(),
    onSuccess: () => {
      invalidate();
      toast.success("Collection deleted");
      onDeleted();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete collection");
    },
  });

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();

    if (!name.length) {
      toast.error("Collection name is required");
      return;
    }

    const minSimilarityPercent = Number(form.minSimilarityPercent);

    if (
      !Number.isFinite(minSimilarityPercent) ||
      minSimilarityPercent < 0 ||
      minSimilarityPercent > 100
    ) {
      toast.error("Match threshold must be between 0 and 100");
      return;
    }

    updateCollection.mutate({
      collectionId: collection.id,
      name,
      description: form.description.trim(),
      minSimilarity: minSimilarityPercent / 100,
    });
  };

  const handleToggleVisibility = () => {
    updateCollection.mutate({
      collectionId: collection.id,
      isPublic: !collection.isPublic,
    });
  };

  const confirmDelete = () => {
    alertDialog.open(`Delete "${collection.name ?? "this collection"}"?`, {
      description:
        "All mock interactions in this collection will be deleted and its endpoint will stop responding.",
      action: {
        label: "Delete",
        onClick: () => deleteCollection.mutateAsync({ collectionId: collection.id }),
      },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{collection.name}</CardTitle>
            <Badge variant={collection.isPublic ? "default" : "outline"}>
              {collection.isPublic ? "Public" : "Private"}
            </Badge>
          </div>
          {collection.description ? (
            <CardDescription>{collection.description}</CardDescription>
          ) : null}
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <span>Collection ID:</span>
            <span className="bg-muted rounded px-2 py-1 font-mono">{collection.publicId}</span>
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
            onClick={confirmDelete}
            disabled={deleteCollection.isPending}
          >
            Delete
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleUpdate} className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="collection-name">Collection name</Label>
            <Input
              id="collection-name"
              placeholder="My new collection"
              value={form.name}
              onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="collection-min-similarity">Match threshold (%)</Label>
            <Input
              id="collection-min-similarity"
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.minSimilarityPercent}
              onChange={(event) =>
                setForm((state) => ({ ...state, minSimilarityPercent: event.target.value }))
              }
            />
            <p className="text-muted-foreground text-xs">
              Queries below this similarity return a 404 instead of the best match. 0 disables.
            </p>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="collection-description">Description (optional)</Label>
            <Textarea
              id="collection-description"
              placeholder="A brief description of what this collection does."
              value={form.description}
              onChange={(event) =>
                setForm((state) => ({ ...state, description: event.target.value }))
              }
              rows={3}
            />
          </div>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" loading={updateCollection.isPending}>
              Update collection
            </Button>
          </div>
        </form>
        <div className="border-border/60 flex flex-col gap-2 rounded-md border border-dashed p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {collection.isPublic ? "Publicly accessible" : "Private collection"}
            </p>
            <p className="text-muted-foreground text-xs">
              {collection.isPublic
                ? "Anyone with the collection ID can query this endpoint."
                : "Only you can preview it. Make it public to use the endpoint from your app."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleVisibility}
            loading={updateCollection.isPending}
          >
            {collection.isPublic ? "Make private" : "Make public"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
