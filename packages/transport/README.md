# @loremllm/transport (deprecated)

This package is split in two. It still re-exports both, so existing imports keep working, but new code should install the package for its framework:

| Before                                           | After                                         |
| ------------------------------------------------ | --------------------------------------------- |
| `@loremllm/transport`                            | [`@loremllm/ai-sdk`](../ai-sdk/README.md)     |
| `@loremllm/transport/copy-messages-to-clipboard` | `@loremllm/ai-sdk/copy-messages-to-clipboard` |
| `@loremllm/transport/eve`                        | [`@loremllm/eve`](../eve/README.md)           |

The APIs are unchanged; only the import path moves.

```bash
pnpm remove @loremllm/transport
pnpm add @loremllm/ai-sdk   # Vercel AI SDK useChat
pnpm add @loremllm/eve      # eve useEveAgent
```
