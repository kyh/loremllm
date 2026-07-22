"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { alertDialog } from "@repo/ui/components/alert-dialog";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { MessageResponse } from "@repo/ui/components/ai-elements/message";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { Textarea } from "@repo/ui/components/textarea";
import { toast } from "@repo/ui/components/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "@repo/api";
import { useTRPC } from "@/trpc/react";

type Interaction = RouterOutputs["collection"]["byId"]["interactions"][number];

type InteractionsTableProps = {
  interactions: Interaction[];
};

export const InteractionsTable = ({ interactions }: InteractionsTableProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteInteraction = useMutation({
    ...trpc.interaction.delete.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries(trpc.collection.byId.queryFilter());
      void queryClient.invalidateQueries(trpc.collection.list.queryFilter());
      toast.success("Mock interaction deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete interaction");
    },
  });

  const confirmDelete = (interaction: Interaction) => {
    alertDialog.open(`Delete "${interaction.title}"?`, {
      description: "This mock response will stop matching queries immediately.",
      action: {
        label: "Delete",
        onClick: () => deleteInteraction.mutateAsync({ interactionId: interaction.id }),
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mock responses</CardTitle>
        <CardDescription>
          Incoming queries are matched against these inputs via semantic search.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {interactions.length ? (
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[14rem]">Interaction</TableHead>
                <TableHead className="min-w-[16rem]">Input</TableHead>
                <TableHead className="min-w-[22rem]">Response</TableHead>
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interactions.map((interaction) => (
                <TableRow key={interaction.id}>
                  <TableCell className="align-top whitespace-normal">
                    <div className="leading-6 font-medium">{interaction.title}</div>
                    {interaction.description ? (
                      <p className="text-muted-foreground mt-1 text-xs leading-5">
                        {interaction.description}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground align-top text-xs leading-5 whitespace-pre-wrap">
                    {interaction.input}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <div className="prose prose-sm max-h-64 max-w-none overflow-y-auto text-sm">
                      <MessageResponse>{interaction.output}</MessageResponse>
                    </div>
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <div className="flex justify-end gap-1">
                      <EditInteractionDialog interaction={interaction} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => confirmDelete(interaction)}
                        disabled={deleteInteraction.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-muted-foreground py-10 text-center text-sm">
            No interactions yet. Create one to start streaming mocked responses.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

type EditFormState = {
  title: string;
  description: string;
  input: string;
  output: string;
};

const toFormState = (interaction: Interaction): EditFormState => ({
  title: interaction.title,
  description: interaction.description ?? "",
  input: interaction.input,
  output: interaction.output,
});

const EditInteractionDialog = ({ interaction }: { interaction: Interaction }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EditFormState>(() => toFormState(interaction));

  const updateInteraction = useMutation({
    ...trpc.interaction.update.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries(trpc.collection.byId.queryFilter());
      // The server touches the parent collection's updatedAt, and the sidebar
      // list is ordered by it — so an edit reorders the list too.
      void queryClient.invalidateQueries(trpc.collection.list.queryFilter());
      toast.success("Mock interaction updated");
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update interaction");
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setForm(toFormState(interaction));
    }
    setOpen(nextOpen);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = form.title.trim();
    const input = form.input.trim();
    const output = form.output.trim();

    if (!title.length || !input.length || !output.length) {
      toast.error("Title, input, and output are required");
      return;
    }

    updateInteraction.mutate({
      interactionId: interaction.id,
      title,
      description: form.description.trim(),
      input,
      output,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>Edit</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit mock response</DialogTitle>
          <DialogDescription>
            Changing the input re-generates the embedding used for matching.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`edit-title-${interaction.id}`}>Title</Label>
            <Input
              id={`edit-title-${interaction.id}`}
              value={form.title}
              onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`edit-description-${interaction.id}`}>Description (optional)</Label>
            <Textarea
              id={`edit-description-${interaction.id}`}
              value={form.description}
              onChange={(event) =>
                setForm((state) => ({ ...state, description: event.target.value }))
              }
              rows={2}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`edit-input-${interaction.id}`}>Input (User Query)</Label>
            <Textarea
              id={`edit-input-${interaction.id}`}
              value={form.input}
              onChange={(event) => setForm((state) => ({ ...state, input: event.target.value }))}
              rows={3}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`edit-output-${interaction.id}`}>Output (Response)</Label>
            <Textarea
              id={`edit-output-${interaction.id}`}
              value={form.output}
              onChange={(event) => setForm((state) => ({ ...state, output: event.target.value }))}
              rows={6}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" loading={updateInteraction.isPending}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
