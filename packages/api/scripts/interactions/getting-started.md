Getting started with LoremLLM is super easy! 🚀

## Quick Start Guide

### 1️⃣ Create an Account
- Sign up at loremllm.com
- Verify your email
- Create or join an organization

### 2️⃣ Create Your First Collection
```bash
# From the dashboard:
- Click "New Collection"
- Give it a name (e.g., "Customer Support Bot")
- Add a description (optional)
```

### 3️⃣ Add Interactions
- Click "Add Interaction" in your collection
- Define the user input (question/prompt)
- Write the expected output (response)
- Save and repeat for multiple scenarios

### 4️⃣ Use Your Mock Endpoint
```javascript
// Get your collection's public ID from the dashboard
const response = await fetch(
  'https://api.loremllm.com/v1/collections/{publicId}/chat',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello!' })
  }
);
```

That's it! Check out our docs for more advanced features.
