# Ollama Context Retention Implementation

This document explains how context retention is implemented in our chatbot application using Ollama, allowing the chatbot to maintain conversation history and learn from user interactions.

## Overview

Context retention refers to the ability of the chatbot to remember previous parts of a conversation and use that information to provide more relevant and personalized responses. Our implementation uses Ollama's context window capabilities along with a conversation state management system to achieve effective context retention.

## How It Works

1. **Conversation State Management**: We use an in-memory store to maintain conversation histories for each user. Each conversation consists of a series of messages with their roles (user or assistant).

2. **Context Window Utilization**: When processing user messages, we send the relevant conversation history to Ollama within its context window, allowing the model to "remember" previous exchanges.

3. **Stateful Conversations**: Each conversation has a unique ID that is used to retrieve and update the conversation state across multiple interactions.

## Key Components

### 1. Conversation Service

The `conversationService.js` file provides the following functionality:

- **Conversation Management**: Creating, retrieving, and deleting conversations
- **Message History**: Adding and retrieving messages within a conversation
- **Automatic Cleanup**: Removing older messages when the context window limit is reached
- **Expiration**: Automatically cleaning up inactive conversations to prevent memory leaks

### 2. AI Service Integration

The `aiService.js` file has been updated to:

- Accept conversation history as a parameter in the `processNLPTask` function
- Format messages appropriately for Ollama's API
- Use an increased context window to accommodate more conversation history

### 3. API Routes

New routes have been added to:

- List a user's conversations
- Create new conversations
- Delete conversations
- Perform maintenance operations like clearing expired conversations

## Configuration Options

Context retention can be configured using the following environment variables:

- `MAX_CONVERSATION_LENGTH`: Maximum number of messages to retain in a conversation (default: 20)
- `CONVERSATION_TTL`: Time-to-live for inactive conversations in milliseconds (default: 1 hour)
- `CHAT_HISTORY_LIMIT`: Limit for the number of messages to fetch when retrieving chat history
- `OLLAMA_MODEL`: The Ollama model to use (must support context retention)

## Testing Context Retention

You can test the context retention capabilities using the provided `test-ollama-context.js` script:

```bash
node test-ollama-context.js
```

This script allows you to have a multi-turn conversation with Ollama and verify that it remembers previous context.

## How This Enables Learning

While this implementation doesn't modify the underlying model weights (true fine-tuning), it creates an experience where the chatbot appears to learn from interactions by:

1. **Remembering User Preferences**: Previous preferences mentioned in conversation are retained and can be referenced
2. **Contextual Understanding**: The model can reference information shared earlier in the conversation
3. **Personalization**: Responses can be tailored based on the conversation history
4. **Coherent Multi-Turn Interactions**: The model can maintain the thread of a conversation across multiple exchanges

## Limitations

- **Memory Constraints**: The context window has a maximum size (typically 4096 tokens for most models)
- **In-Memory Storage**: The current implementation uses in-memory storage, which doesn't persist across server restarts
- **No True Learning**: This approach creates the impression of learning without actually updating the model weights

## Future Improvements

- **Persistent Storage**: Moving conversation state to a database for persistence across restarts
- **Summarization**: Implementing a system to summarize longer conversations to fit within context limits
- **Embeddings**: Using vector embeddings to retrieve relevant parts of longer conversation histories
- **Fine-Tuning**: Adding actual fine-tuning capabilities for persistent model improvements

## Conclusion

Our implementation of context retention with Ollama creates an interactive experience where the chatbot can maintain conversation state and appear to learn from user interactions. While not true learning in the sense of model weight updates, it significantly improves the user experience by making conversations more coherent and personalized. 