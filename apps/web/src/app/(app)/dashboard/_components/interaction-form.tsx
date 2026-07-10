"use client";

import type { FormEvent } from "react";
import { useState } from "react";
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

import { useTRPC } from "@/trpc/react";

type InteractionFormState = {
  title: string;
  description: string;
  input: string;
  output: string;
};

const emptyForm: InteractionFormState = {
  title: "",
  description: "",
  input: "",
  output: "",
};

type InteractionFormProps = {
  collectionId: string;
};

export const InteractionForm = ({ collectionId }: InteractionFormProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<InteractionFormState>(emptyForm);

  const createInteraction = useMutation({
    ...trpc.interaction.create.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries(trpc.collection.byId.queryFilter());
      void queryClient.invalidateQueries(trpc.collection.list.queryFilter());
      setForm(emptyForm);
      toast.success("Mock interaction saved");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save interaction");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = form.title.trim();
    const input = form.input.trim();
    const output = form.output.trim();

    if (!title.length || !input.length || !output.length) {
      toast.error("Title, input, and output are required");
      return;
    }

    createInteraction.mutate({
      collectionId,
      title,
      description: form.description.trim() || undefined,
      input,
      output,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add new mock response</CardTitle>
        <CardDescription>Create a new mock interaction for this collection.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="interaction-title">Title</Label>
            <Input
              id="interaction-title"
              placeholder="Weather in San Francisco"
              value={form.title}
              onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="interaction-description">Description (optional)</Label>
            <Textarea
              id="interaction-description"
              placeholder="A brief description of this mock interaction."
              value={form.description}
              onChange={(event) =>
                setForm((state) => ({ ...state, description: event.target.value }))
              }
              rows={3}
            />
          </div>
          <div className="grid gap-1.5 md:col-span-1">
            <Label htmlFor="interaction-input">Input (User Query)</Label>
            <Textarea
              id="interaction-input"
              placeholder="What's the weather like in San Francisco?"
              value={form.input}
              onChange={(event) => setForm((state) => ({ ...state, input: event.target.value }))}
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
              value={form.output}
              onChange={(event) => setForm((state) => ({ ...state, output: event.target.value }))}
              rows={5}
              required
            />
            <p className="text-muted-foreground text-xs">
              Supports markdown formatting for richer answers.
            </p>
          </div>
          <div className="flex justify-end md:col-span-2">
            <Button type="submit" loading={createInteraction.isPending}>
              Save mock response
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
