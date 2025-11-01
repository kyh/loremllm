# LoremLLM

> LoremLLM is a collection of tools that help developers mock LLM responses.

## When to Use LoremLLM

Use LoremLLM when you need:

- **Development/Prototyping** - Build AI-powered UIs before your backend is ready
- **Testing** - Create consistent test cases and validate edge cases
- **Demos** - Control exactly what's shown to stakeholders or customers
- **Learning** - Teach AI concepts without incurring API costs
- **High Volume Testing** - Serve thousands of similar queries efficiently
- **Offline Development** - Work without internet or API access

## Packages

- [**`@loremllm/transport`**](./packages/transport/README.md) - Transport implementation for the [Vercel AI SDK UI layer](https://v6.ai-sdk.dev/docs/ai-sdk-ui/transport). Allows you to mock AI interactions directly in your frontend React components.

- [**`@loremllm/platform`**](./apps/nextjs/README.md) - [loremllm.com](https://loremllm.com) application that provides:
  - Web UI for managing collections of LLM interactions
  - REST API endpoints (`/api/chat`) for:
    - Chat queries with semantic search matching
    - Markdown parsing
    - Lorem Ipsum generation

## Features

- ✨ **Create collections of mock interactions** - Organize your mock responses into reusable collections
- 🎯 **Define specific input/output pairs** - Map user queries to exact responses
- 🔄 **Semantic search matching** - Automatically match similar queries using embeddings
- 🚀 **Deploy endpoints** - Generate API endpoints that mimic real LLM behavior
- 💰 **Save costs** - Eliminate API costs during development and testing
- 🧪 **Perfect for testing** - Get consistent, predictable responses for your test suites
- 📚 **Ideal for demos** - Control exactly what's shown in product demonstrations

## License

See [LICENSE](./LICENSE) for details.
