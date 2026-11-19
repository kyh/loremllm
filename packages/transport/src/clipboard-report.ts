export const COPY_SUCCESS_MESSAGE = "Static transport template copied to your clipboard.";

const clipboardErrorMessage = (cause: unknown) => {
  if (cause instanceof Error) {
    if (cause.name === "NotAllowedError" || cause.name === "SecurityError") {
      return "Clipboard access denied. Please grant clipboard permissions.";
    }

    if (cause.name === "NotFoundError") {
      return "Clipboard not available.";
    }

    return cause.message;
  }

  return "Unknown clipboard error.";
};

export const copyFailureMessage = (cause: unknown) =>
  `Failed to copy the static transport template.\n\n${clipboardErrorMessage(cause)}`;

export const reportClipboardWrite = async (
  write: Promise<void>,
  notify: (message: string) => void,
) => {
  try {
    await write;
    notify(COPY_SUCCESS_MESSAGE);
  } catch (error) {
    notify(copyFailureMessage(error));
  }
};
