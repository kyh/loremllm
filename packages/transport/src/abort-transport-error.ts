export class AbortTransportError extends Error {
  constructor() {
    super("The transport request was aborted.");
    // oxlint-disable-next-line unicorn/custom-error-definition -- "AbortError" is the name the AI SDK and DOM consumers check to recognize an abort
    this.name = "AbortError";
  }
}
