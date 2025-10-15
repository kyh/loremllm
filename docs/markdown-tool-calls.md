# Markdown Tool Call Blocks

This document explains how the chat markdown parser recognizes tool calls embedded in markdown transcripts and how to format them correctly so the streaming pipeline can surface tool invocation UI.

## Overview

Tool invocations are expressed as fenced code blocks whose info string is `tool`. The content of the fence is written in YAML so authors can describe nested data without having to write JSON inline. The parser converts each `tool` fence into a structured tool chunk while preserving the surrounding markdown for normal streaming.

````markdown
The assistant is going to search for cats.

```tool search call_123
state: output-available
input:
  query: cats
output:
  results:
    - title: All About Cats
      url: https://example.com/cats
```

Here are the results we found!
````

In this example:

- The surrounding text (`The assistant is going to search for cats.` and `Here are the results we found!`) streams as normal text chunks.
- The `tool` fence describes a single tool invocation.
- The YAML body supplies the metadata that the parser understands (described below).

## Fence Format

### Info String

- Start the fence with `````tool`````.
- You can optionally append the tool name and call ID separated by spaces, e.g. `````tool search call_123`````.
- Assignments such as `````tool name=search id=call_123````` are also supported. Quoted values (e.g. `name="weather lookup"`) are unquoted automatically.

### Body Fields

Everything between the opening `````tool````` line and the closing ````` ``` ````` line is parsed as YAML. The following fields are recognized:

| Field | Required? | Description |
| --- | --- | --- |
| `toolCallId` / `id` | Optional | Stable identifier for the tool call. You can also supply this in the info string. A fallback such as `tool-call-1` is generated when omitted. |
| `toolName` / `name` | Optional | Human-readable name of the tool. You can also supply this in the info string. Defaults to `tool` when not provided. |
| `state` | Optional | Final state of the tool invocation. Must be one of `input-streaming`, `input-available`, `output-available`, or `output-error`. |
| `input` | Optional | YAML payload that was sent to the tool. When present, a `tool-input-available` event is emitted with this value. |
| `output` | Optional | YAML payload returned by the tool. When provided (or when `state` is `output-available`), a `tool-output-available` event is emitted. |
| `errorText` / `error` | Optional | Error message to display when the tool invocation fails. When provided (or when `state` is `output-error`), a `tool-output-error` event is emitted. |

Any additional YAML fields are ignored by the parser but preserved in the emitted chunk so downstream consumers can inspect them if needed.

## Worked Examples

Below are a few example transcripts that illustrate how fences map to parsed tool chunks and streaming events.

### Single Tool Call with Output

````markdown
I looked up the weather forecast.

```tool name=weather-search id=call_42
state: output-available
input:
  location: Paris
output:
  summary: "Light rain expected"
  temperatureC: 18
```

Let me know if you need anything else!
````

Parsed tool chunk:

```json
{
  "type": "tool",
  "toolName": "weather-search",
  "toolCallId": "call_42",
  "state": "output-available",
  "input": { "location": "Paris" },
  "output": { "summary": "Light rain expected", "temperatureC": 18 }
}
```

### Multiple Tool Calls in One Response

````markdown
I'll check two sources.

```tool search call_a
state: output-available
input:
  query: "coffee shops near me"
output:
  results:
    - name: Local Beans
      distance: 0.3
```

```tool map-directions call_b
state: output-available
input:
  origin: "123 Main St"
  destination: "Local Beans"
output:
  etaMinutes: 5
```

Both tools reported back successfully.
````

The parser emits a separate tool chunk for each fence, preserving the order so the UI can stream both tool invocations sequentially.

### Tool Error Example

````markdown
Trying the booking service now.

```tool booking-service call_failure
state: output-error
input:
  reservationId: 123
errorText: "Reservation not found"
```

I'll fall back to manual booking.
````

Because the state is `output-error`, the streamer emits a `tool-output-error` event with the provided `errorText`.

## Streaming Behavior

While streaming, the markdown parser converts the document into a sequence of text and tool chunks. The tool chunk triggers three possible events in `createStreamChunks`:

1. A `tool-input-available` event with the parsed `input` payload (defaulting to an empty object).
2. A `tool-output-available` event when `state` is `output-available` or `output` is provided.
3. A `tool-output-error` event when `state` is `output-error` or `errorText` is supplied.

These events allow the UI to render progressive tool invocation states alongside the surrounding markdown content.
