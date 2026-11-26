import type { UIMessage } from "ai";

import {
  COPY_SUCCESS_MESSAGE,
  copyFailureMessage,
  reportClipboardWrite,
} from "./clipboard-report.ts";
import { buildStaticTransportTemplate } from "./static-transport-template.ts";

type RuntimeGlobal = Omit<typeof globalThis, "navigator" | "alert"> & {
  navigator?: {
    clipboard?: {
      writeText?: (value: string) => Promise<void> | void;
    };
  };
  alert?: (message?: string) => void;
};

interface CopyMessagesOptions<UI_MESSAGE extends UIMessage = UIMessage> {
  messages: UI_MESSAGE[];
}

const isCallable = (value: unknown): value is (...args: never[]) => void =>
  typeof value === "function";

const notify = (runtime: RuntimeGlobal, message: string) => {
  if (isCallable(runtime.alert)) {
    runtime.alert(message);
  } else if (isCallable(globalThis.console?.info)) {
    console.info(message);
  }
};

export const copyMessagesToClipboard = <UI_MESSAGE extends UIMessage = UIMessage>(
  options: CopyMessagesOptions<UI_MESSAGE>,
) => {
  const runtime: RuntimeGlobal = globalThis;

  try {
    const seenIds = new Set<string>();

    const assistantMessages = options.messages.filter((message): message is UI_MESSAGE => {
      if (message.role !== "assistant") {
        return false;
      }

      if (seenIds.has(message.id)) {
        return false;
      }

      seenIds.add(message.id);

      return true;
    });

    if (assistantMessages.length === 0) {
      notify(runtime, "No assistant messages were found to copy.");

      return;
    }

    const template = buildStaticTransportTemplate(assistantMessages);
    const clipboard = runtime.navigator?.clipboard;

    if (!clipboard || !isCallable(clipboard.writeText)) {
      const errorMessage = "Clipboard access is not available in this environment.";
      notify(runtime, errorMessage);
      throw new Error(errorMessage);
    }

    // WARNING: call writeText on the clipboard object itself, or it throws "illegal invocation".
    const result = clipboard.writeText(template);

    if (result instanceof Promise) {
      void reportClipboardWrite(result, (message) => {
        notify(runtime, message);
      });
    } else {
      notify(runtime, COPY_SUCCESS_MESSAGE);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Clipboard access is not available")) {
      throw error;
    }

    notify(runtime, copyFailureMessage(error));
  }
};
