# Markdown Tool Call Blocks

This document explains how the chat markdown parser recognizes tool calls embedded in markdown transcripts and how to format them correctly so the streaming pipeline can surface tool invocation UI.

## Overview

When the assistant wants to describe a tool interaction, it emits a fenced code block tagged with the language identifier `tool`. The fenced block must contain a single JSON object that describes the tool invocation. During parsing, the markdown pipeline converts this JSON object into a `tool` chunk that is used to produce tool-related stream events.

Outside of the `tool` code fence you can write regular markdown. The parser keeps the surrounding text tokens intact so they continue to stream normally before and after the tool call metadata.

## Example

```markdown
The assistant is going to search for cats.

```tool
{
  "toolCallId": "call_123",
  "toolName": "search",
  "state": "output-available",
  "input": {
    "query": "cats"
  },
  "output": {
    "results": [
      { "title": "All About Cats", "url": "https://example.com/cats" }
    ]
  }
}
```

Here are the results we found!
```

In this example:

- The surrounding text (`The assistant is going to search for cats.` and `Here are the results we found!`) streams as normal text chunks.
- The `tool` code fence describes a single tool invocation.
- The JSON object includes the fields that the parser understands (described below).

## JSON Fields

| Field | Required? | Description |
| --- | --- | --- |
| `toolCallId` | Optional | Stable identifier for the tool call. If omitted, a fallback ID such as `tool-call-1` is generated. |
| `toolName` | Optional | The human-readable name of the tool. Defaults to `"tool"` when not provided. |
| `state` | Optional | Final state of the tool invocation. Must be one of `"input-streaming"`, `"input-available"`, `"output-available"`, or `"output-error"`. |
| `input` | Optional | JSON payload that was sent to the tool. When present, a `tool-input-available` event is emitted with this value. |
| `output` | Optional | JSON payload returned by the tool. When provided (or when `state` is `"output-available"`), a `tool-output-available` event is emitted. |
| `errorText` | Optional | Error message to display when the tool invocation fails. When provided (or when `state` is `"output-error"`), a `tool-output-error` event is emitted. |

Any additional fields in the JSON object are ignored by the parser but preserved in the emitted chunk so downstream consumers can inspect them if needed.

## Streaming Behavior

While streaming, the markdown parser converts the document into a sequence of text and tool chunks. The tool chunk triggers three possible events in `createStreamChunks`:

1. A `tool-input-available` event with the parsed `input` payload (defaulting to an empty object).
2. A `tool-output-available` event when `state` is `output-available` or `output` is provided.
3. A `tool-output-error` event when `state` is `output-error` or `errorText` is supplied.

These events allow the UI to render progressive tool invocation states alongside the surrounding markdown content.
