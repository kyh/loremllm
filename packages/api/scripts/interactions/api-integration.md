# Integrating LoremLLM

LoremLLM provides a simple REST API that's compatible with most AI SDKs:

## 📦 Using with Vercel AI SDK

```typescript
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const loremllm = createOpenAI({
  baseURL: "https://api.loremllm.com/v1/collections/{publicId}",
  apiKey: "not-needed", // No API key required for public collections
});

const result = await streamText({
  model: loremllm("mock"),
  messages: [{ role: "user", content: "Hello!" }],
});
```

## 🔌 Direct API Call

```javascript
const response = await fetch(
  "https://api.loremllm.com/v1/collections/{publicId}/chat",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "What is LoremLLM?",
      stream: true, // Optional: enable streaming
    }),
  },
);
```

## ⚙️ Configuration

- Get your `publicId` from the dashboard
- Optional: Set custom headers for tracking
- Supports both streaming and non-streaming responses
- Works with OpenAI-compatible clients
