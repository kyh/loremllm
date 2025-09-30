# Demo Interactions

This directory contains markdown files with the output content for demo interactions. Each file represents a response that will be used when creating the demo collection.

## Files

- `greeting.md` - Generic greeting message
- `what-is-loremllm.md` - Explanation of LoremLLM platform
- `main-features.md` - Overview of key features
- `pricing.md` - Pricing tiers and information
- `getting-started.md` - Quick start guide
- `use-cases.md` - Common use cases and examples
- `api-integration.md` - Integration guide
- `semantic-search.md` - Explanation of semantic search
- `troubleshooting.md` - Common issues and solutions
- `vs-real-llms.md` - Comparison with real LLM APIs
- `support.md` - Support options and resources

## Usage

These files are loaded by the `seed.ts` script to populate the demo collection with interactions. Each file contains the markdown-formatted response that will be returned when a user asks the corresponding question.

## Editing

To update an interaction response:

1. Edit the corresponding `.md` file
2. Run the seed script again to update the collection

The markdown format supports:

- Headers (# ## ###)
- Lists (- or \*)
- Code blocks (```language)
- Links ([text](url))
- Bold (**text**)
- Italic (_text_)
- Emojis 🎉
