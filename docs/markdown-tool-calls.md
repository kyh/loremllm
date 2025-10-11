# Markdown Tool Call Blocks

This document explains how the chat markdown parser recognizes tool calls embedded in markdown transcripts and how to format them correctly so the streaming pipeline can surface tool invocation UI.

## Overview

When the assistant wants to describe a tool interaction, it emits a blockquote callout that mirrors the GitHub-flavored markdown alert syntax. The first line of the callout starts with `> [!tool …]` and can include optional metadata. The rest of the block is written using YAML-style key/value pairs. During parsing, the markdown pipeline converts this callout into a `tool` chunk that is used to produce tool-related stream events.

Outside of the `tool` callout you can write regular markdown. The parser keeps the surrounding text tokens intact so they continue to stream normally before and after the tool call metadata.

## Example

```markdown
The assistant is going to search for cats.

> [!tool search call_123]
> state: output-available
> input:
>   query: cats
> output:
>   results:
>     - title: All About Cats
>       url: https://example.com/cats

Here are the results we found!
```

In this example:

- The surrounding text (`The assistant is going to search for cats.` and `Here are the results we found!`) streams as normal text chunks.
- The `tool` callout describes a single tool invocation.
- The YAML-style metadata inside the callout includes the fields that the parser understands (described below).

## Callout Format

The parser understands tool metadata provided either in the callout header or as YAML within the body of the callout block.

### Header

- Start the block with `> [!tool …]`.
- You can optionally append the tool name and call ID separated by spaces, e.g. `> [!tool search call_123]`.
- Alternatively you can include assignments such as `> [!tool name=search id=call_123]`.

### Body Fields

Inside the callout, indent each metadata line with `> `. The content is parsed as YAML, which makes it easy to represent nested objects without writing JSON. The following fields are recognized:

| Field | Required? | Description |
| --- | --- | --- |
| `toolCallId` / `id` | Optional | Stable identifier for the tool call. You can also supply this in the header. A fallback such as `tool-call-1` is generated when omitted. |
| `toolName` / `name` | Optional | Human-readable name of the tool. You can also supply this in the header. Defaults to `tool` when not provided. |
| `state` | Optional | Final state of the tool invocation. Must be one of `input-streaming`, `input-available`, `output-available`, or `output-error`. |
| `input` | Optional | YAML payload that was sent to the tool. When present, a `tool-input-available` event is emitted with this value. |
| `output` | Optional | YAML payload returned by the tool. When provided (or when `state` is `output-available`), a `tool-output-available` event is emitted. |
| `errorText` / `error` | Optional | Error message to display when the tool invocation fails. When provided (or when `state` is `output-error`), a `tool-output-error` event is emitted. |

Any additional YAML fields are ignored by the parser but preserved in the emitted chunk so downstream consumers can inspect them if needed.

## Streaming Behavior

While streaming, the markdown parser converts the document into a sequence of text and tool chunks. The tool chunk triggers three possible events in `createStreamChunks`:

1. A `tool-input-available` event with the parsed `input` payload (defaulting to an empty object).
2. A `tool-output-available` event when `state` is `output-available` or `output` is provided.
3. A `tool-output-error` event when `state` is `output-error` or `errorText` is supplied.

These events allow the UI to render progressive tool invocation states alongside the surrounding markdown content.
