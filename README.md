# LoremLLM

LoremLLM is a collection of tools that help developers mock LLM responses. aka worlds most overengineered lorem ipsum generator.

## When to Use LoremLLM

- **Development/Prototyping** - Build AI-powered UIs before your backend is ready
- **Testing** - Create consistent test cases and validate edge cases
- **Demos** - Control exactly what's shown to stakeholders or customers
- **Learning** - Teach AI concepts without incurring API costs
- **High Volume Testing** - Serve thousands of similar queries efficiently
- **Offline Development** - Work without internet or API access

## Packages

- [**`@loremllm/transport`**](./packages/transport/README.md) - Transport implementation for the [Vercel AI SDK UI layer](https://v6.ai-sdk.dev/docs/ai-sdk-ui/transport). Allows you to mock AI interactions directly in your frontend React components.

- [**`@loremllm/web`**](./apps/web/README.md) - [loremllm.com](https://loremllm.com) application that provides:
  - Web UI for managing collections of LLM interactions
  - REST API endpoints (`/api/chat`) for:
    - Chat queries with semantic search matching
    - Markdown parsing
    - Lorem Ipsum generation

## Features

- ✨ **Create collections of mock interactions** - Organize your mock responses into reusable collections
- 🎯 **Define specific input/output pairs** - Map user queries to exact responses
- 🔄 **Semantic search matching** - Automatically match similar queries using embeddings
- 🎚️ **Match thresholds** - Optionally 404 instead of replying when no mock is similar enough
- 🚀 **Deploy endpoints** - Generate API endpoints that mimic real LLM behavior
- 💰 **Save costs** - Eliminate API costs during development and testing
- 🧪 **Perfect for testing** - Get consistent, predictable responses for your test suites
- 📚 **Ideal for demos** - Control exactly what's shown in product demonstrations

## API

`POST https://loremllm.com/api/chat` with a JSON body. Set `type` explicitly — untyped bodies fall back to shape inference for backwards compatibility.

```jsonc
// Query a public collection (streams an AI SDK UI message response)
{ "type": "chat", "collectionId": "<publicId>", "messages": [{ "role": "user", "parts": [{ "type": "text", "text": "Hello" }] }] }

// Stream markdown back as-is
{ "type": "markdown", "markdown": "# Hello" }

// Generate lorem ipsum
{ "type": "lorem", "units": "sentences", "count": 3 }
```

Responses stream in the [AI SDK UI message format](https://v6.ai-sdk.dev/docs/ai-sdk-ui/transport), so `useChat` works out of the box. Chat responses include the matched interaction's id, title, and similarity as message metadata. Errors use meaningful status codes: `400` invalid payload, `403` private collection, `404` unknown collection or no match above the collection's similarity threshold.

## License

See [LICENSE](./LICENSE) for details.
