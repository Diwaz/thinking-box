# Thinking-box - Agentic WebApp Builder

Thinking-box is a full-stack web application that transforms natural language prompts into complete, functional websites. Built with modern technologies, it leverages AI agents, sandbox execution, and real-time streaming to deliver a seamless website generation experience.

## Overview

Thinking-box allows users to describe their desired website in plain English, and the AI generates a complete, production-ready website in react js. The application features real-time streaming feedback through multiple generation phases, secure code execution in isolated sandboxes, and persistent storage of generated projects.

## Architecture

<p align="center">
  <img src="./assets/architecture-tb.png" alt="System Architecture" width="100%">
</p>

The application follows a modern full-stack architecture with clear separation of concerns:

### Frontend
- **Framework:** Next.js 15 with App Router
- **UI Layer:** React 18 with TypeScript
- **Styling:** Tailwind CSS with shadcn/ui components
- **Authentication:** BetterAuth with session management
- **State Management:** SessionStorage Management

### Backend
- **Runtime:** Bun (high-performance JavaScript runtime)
- **API:** RESTful endpoints with TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **AI Integration:** Gemini/Anthropic API
- **Sandbox:** E2B Code Interpreter for isolated execution
- **Storage:** Oracle bucket for storing generated code

### Infrastructure
- **Containerization:** Docker with multi-service orchestration
- **Database:** PostgreSQL in Docker container
- **File Storage:** Oracle bucket
- **Sandbox Environment:** E2B cloud sandboxes

## Key Features

### Agentic Website Generation
- Natural language prompt interface
- Real-time streaming of generation progress
- Context-aware follow-up conversations
- Enhanced prompt optimization

### Code Execution & Validation
- Secure sandbox execution via E2B
- Isolated environment for each user
- Real-time code validation
- File system management within sandboxes

### Project Management
- Multiple projects per user
- Conversation threads within projects
- File tree visualization
- Syntax-highlighted code viewer using monaco editor

### User Experience
- Responsive design for all devices
- Real-time streaming feedback
- Rate limiting protection
- Conversation limit management

## How It Works

### LLM Processing Graph (LangGraph flow)

The LLM processing pipeline handles code generation, context summarisation and providing the final response to the user

- **User Input Validation:** Validate invalid user input
- **Prompt Enhancement:** Optimizes user input for better AI understanding
- **Code Generation:** Generates the code according to the users prompt
- **Context Management:** Maintains conversation history efficiently
- **Streaming Generation:** Produces real-time responses with phase indicators
- **Response Formatting:** Structures output for seamless frontend integration

### AI Agent Workflow


<p align="center">
  <img src="./assets/agent-orchestration.png" alt="Agentic orchestration" width="100%">
</p>


The AI agent operates through a simple agentic loop that orchestrates the entire website generation process, above image is the example on how normally the tool call is done in the agentic development and how final response reaches to the end user. 

1. **InputValidation Node:** The entrypoint of the graph , It rejects invalid user query and generates title if valid and relevent 
    - *Routes:* Decides whether to end the user operation or to move furhter

2. **EnhancedPrompt Node:** Intercepts  user queries and rewrites them using advanced prompt engineering techniques to maximize LLM performance. 

3. **LlmCall Node:** The core reasoning engine. It interacts with the model to generate text, request tool execution, or write code.
    - *Routes:* Decides whether to use tools, validate code, or finish.

4. **Tool Node:** Executes external capabilities (e.g., running code in the sandbox, file system operations) and feeds the output back to the LLM.

5. **Validation Node:** A quality control gate. It tests generated code for syntax errors, logical bugs, or security issues.
    - *Routes:* If valid, proceeds to Summarizer. If invalid, loops back to LLM Call with error logs for self-correction.

6. **Summarizer Node:** Consolidates the conversation history into a concise context for the future generation in the localDisk.

7. **Final Node:** Formats the final data payload, ensuring structure and clarity before the response is streamed back to the user via WebSocket.

## Getting Started

### Prerequisites

Ensure you have the following installed and configured:
- Node.js 18+ or Bun
- Redis latest
- PostgreSQL 14+
- Docker Compose (optional)
- Oracle cloud acoount with .oci config file 
- E2B API key
- Gemini/Anthropic API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Diwaz/thinking-box/
cd thinking-box
```

2. **Install dependencies**

Frontend:
```bash
cd thinking-box-fe
bun install
```

Backend:
*present in the root folder*
```bash
bun install
```

3. **Configure environment variables**

Frontend `.env`:
```env
NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8080
NEXT_PUBLIC_BACKEND_WS=ws://localhost:8080
NEXT_PUBLIC_CALLBACK=http://localhost:3000
```

Backend `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/tb"
E2B_API_KEY=your_e2b_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=""
BETTER_AUTH_SECRET=
BETTER_AUTH_URL= 
CLIENT_SECRET=
CLIENT_ID=
BACKEND_BASE_URL=""
E2B_SANDBOX_TEMPLATE=''
BUCKET_PREFIX=""
BUCKET_LOCAL_DIR=""
BUCKET_NAME=""
BUCKET_NAMESPACE=""
REDIS_USERNAME=
REDIS_PASSWORD=
REDIS_HOST=redis(on compose) / localhost
REDIS_PORT=6379
```

4. **Set up the database**
```bash
bunx prisma migrate dev
bunx prisma generate
```

5. **Start the development servers**

Terminal 1 (Backend):
```bash
bun run index.ts
```

Terminal 2 (Frontend):
```bash
cd thinking-box-fe
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Deployment

Run the entire application stack with Docker Compose:

```bash
docker-compose up --build
```

This will start:
- Frontend on port 3000
- Backend on port 8080
- PostgreSQL on port 5432

## Project Structure

```
thinking-box/
├── thinking-box-fe/           # Next.js application
│   ├── app/           # App Router pages and API routes
│   ├── components/    # React components (UI, streaming, etc.)
│   ├── lib/           # Utility libraries and context
│   └── public/        # Static assets
|           # Bun API server
├── prisma/            # Database schema and migrations
├── agenticManager.ts  # AI agent orchestration
├── lib/               # Utility libraries for auth and zod schema validation
├── authMiddleware.ts  # Auth middleware for better auth
├── prompt.ts          # AI system prompts
└── guardrails.ts      # Safety and validation
├── index.ts          # root server handles all the routing and sandbox lifecycle logic
├── assets/            # Documentation images and diagrams
```

## API Overview

The backend exposes RESTful APIs for user management, project operations, and AI prompt handling. Real-time streaming is implemented for AI response generation, providing live updates through multiple phases.

**Main API Categories:**
- **Projects:** CRUD operations for website projects
- **Prompts:** AI generation requests and conversation handling
- **Files:** Oci bucket file retrieval and management


## Technology Highlights

### Real-time Streaming
The application implements WebSocket streaming for AI responses, with dedicated React components for each generation phase. This provides users with immediate feedback and transparency into the AI's thinking process.

### Sandbox Security
All generated code is executed in isolated E2B sandboxes, ensuring security and preventing malicious code execution. Each sandbox has resource limitations and network restrictions.

### Persistent Storage
Generated projects are stored in Oracle cloud bucket for secure access. Project metadata and conversation history are maintained in PostgreSQL for quick retrieval and project management.

### Type Safety
Full TypeScript implementation across frontend and backend ensures type safety, better developer experience, and fewer runtime errors. Prisma provides type-safe database queries with auto-generated types.

## Security Features

- **Authentication:** Authentication using better auth
- **Input Validation:** Prompt sanitization, SQL injection prevention through zod and prisma
- **Sandbox Isolation:** E2B sandboxes with resource constraints
- **Content Policies:** AI guardrails and output validation

## Performance Optimization

- **Frontend:** Server-side rendering, code splitting, lazy loading
- **Backend:** Efficient streaming, optimized queries
- **Rate-Limiting:** Preventing attacker from DDos

## Development & Deployment

### Development Mode
Both frontend and backend support hot reload during development. The frontend uses Next.js fast refresh, while the backend uses Bun's watch mode.

### Production Build
```bash
# Frontend
cd thinking-box-fe
bun run build
bun start

# Backend
cd backend
bun run index.ts
```

### Docker Production
The included Docker configuration supports production deployment with optimized builds, health checks, and resource management.

## Troubleshooting

**Database Connection Issues**
- Verify PostgreSQL is running and accessible
- Check DATABASE_URL format in backend .env
- Run `bunx prisma migrate dev` to ensure schema is up to date

**E2B Sandbox Errors**
- Verify E2B_API_KEY is valid
- Check E2B account status and credits
- Review e2b.toml configuration

**Codebase Upload Failures**
- Confirm Oci credentials are correct
- Verify oracle bucket exists and has proper permissions
- Check proper config of namespace , prefix and the configuration of .oci config file from oracle docs

**Frontend Build Errors**
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && bun install`

## License

This project is licensed under the MIT License.

## Links

- [Thinking-box] (https://thinking-box.civcam.xyz/)

---

Built with passion for AI-powered development