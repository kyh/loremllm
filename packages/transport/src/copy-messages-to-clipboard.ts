import type { UIMessage } from "ai";

const INDENT = "  ";
const SUCCESS_MESSAGE = "Static transport template copied to your clipboard.";

type RuntimeGlobal = Omit<typeof globalThis, "navigator" | "alert"> & {
  navigator?: {
    clipboard?: {
      writeText?: (value: string) => Promise<void> | void;
    };
  };
  alert?: (message?: string) => unknown;
};

type CopyMessagesOptions<UI_MESSAGE extends UIMessage = UIMessage> = {
  messages: UI_MESSAGE[];
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown clipboard error.";
}

function handleCopyError(runtime: RuntimeGlobal, error: unknown): void {
  const reason = getErrorMessage(error);
  notify(runtime, `Failed to copy the static transport template.\n\n${reason}`);
}

export function copyMessagesToClipboard<
  UI_MESSAGE extends UIMessage = UIMessage,
>(options: CopyMessagesOptions<UI_MESSAGE>): void {
  // Get all assistant messages and deduplicate by message ID
  const seenIds = new Set<string>();
  const assistantMessages = options.messages.filter(
    (message): message is UI_MESSAGE => {
      if (message.role !== "assistant") {
        return false;
      }
      if (seenIds.has(message.id)) {
        return false;
      }
      seenIds.add(message.id);
      return true;
    },
  );

  const runtime = globalThis as RuntimeGlobal;

  if (assistantMessages.length === 0) {
    notify(runtime, "No assistant messages were found to copy.");
    return;
  }

  const template = buildStaticTransportTemplate(assistantMessages);
  const writeText = runtime.navigator?.clipboard?.writeText;

  if (typeof writeText !== "function") {
    const errorMessage =
      "Clipboard access is not available in this environment.";
    notify(runtime, errorMessage);
    throw new Error(errorMessage);
  }

  try {
    const result = writeText(template);
    if (result instanceof Promise) {
      void result
        .then(() => {
          notify(runtime, SUCCESS_MESSAGE);
        })
        .catch((error: unknown) => {
          handleCopyError(runtime, error);
        });
    } else {
      notify(runtime, SUCCESS_MESSAGE);
    }
  } catch (error) {
    handleCopyError(runtime, error);
    throw error;
  }
}

function notify(runtime: RuntimeGlobal, message: string): void {
  if (typeof runtime.alert === "function") {
    runtime.alert(message);
  } else if (
    typeof console !== "undefined" &&
    typeof console.info === "function"
  ) {
    console.info(message);
  }
}

function buildStaticTransportTemplate<UI_MESSAGE extends UIMessage = UIMessage>(
  messages: UI_MESSAGE[],
): string {
  const allParts: UI_MESSAGE["parts"][number][] = [];
  for (const message of messages) {
    const parts = Array.isArray(message.parts) ? message.parts : [];

    // Reconstruct tool parts with input-available state
    const reconstructedParts: UI_MESSAGE["parts"][number][] = [];
    for (const part of parts) {
      // Check if this is a tool part with output state that has input data
      const isToolPart =
        (typeof part.type === "string" && part.type.startsWith("tool-")) ||
        part.type === "dynamic-tool";

      if (isToolPart) {
        const toolPart = part as {
          type: `tool-${string}` | "dynamic-tool";
          toolCallId: string;
          toolName?: string;
          state?: string;
          input?: unknown;
          output?: unknown;
          errorText?: string;
          [key: string]: unknown;
        };

        // If tool part has output-available or output-error state with input,
        // create an input-available part first
        if (
          (toolPart.state === "output-available" ||
            toolPart.state === "output-error") &&
          toolPart.input !== undefined
        ) {
          // Create input-available part
          const inputPart = {
            type: toolPart.type,
            toolCallId: toolPart.toolCallId,
            ...(toolPart.type === "dynamic-tool" && toolPart.toolName
              ? { toolName: toolPart.toolName }
              : {}),
            state: "input-available",
            input: toolPart.input,
          } as UI_MESSAGE["parts"][number];
          reconstructedParts.push(inputPart);
        }
      }

      // Add the original part
      reconstructedParts.push(part);
    }

    allParts.push(...reconstructedParts);
  }

  const indent = INDENT.repeat(2);
  const formattedParts = allParts.flatMap((part, index) => {
    const formatted = formatYield(part, indent);
    return index < allParts.length - 1 ? [...formatted, ""] : formatted;
  });

  const partsSection = formattedParts.join("\n");

  return `import { StaticChatTransport } from "@loremllm/transport";

export const transport = new StaticChatTransport({
  chunkDelayMs: [50, 100],
  async *mockResponse() {
${partsSection}
  },
});
`;
}

function formatYield(part: unknown, indent: string): string[] {
  const json = JSON.stringify(part, null, 2);

  if (!json) {
    return [`${indent}yield {};`];
  }

  const lines = json.split("\n");
  const formatted: string[] = [];

  lines.forEach((line, lineIndex) => {
    if (lineIndex === 0) {
      formatted.push(`${indent}yield ${line}`);
    } else if (lineIndex === lines.length - 1) {
      formatted.push(`${indent}${line};`);
    } else {
      formatted.push(`${indent}${line}`);
    }
  });

  return formatted;
}
