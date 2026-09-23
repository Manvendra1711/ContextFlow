// In-memory "database" for the prototype so you don't have to set up Postgres immediately!

export const threads = new Map();
export const messages = new Map();

// threadId -> { id, parentThreadId, title, createdAt }
// messageId -> { id, threadId, role, content, branchedText, childThreadId, createdAt }
