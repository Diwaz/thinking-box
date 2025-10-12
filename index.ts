// Step 1: define tools and model
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { StateGraph, START, END } from "@langchain/langgraph";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import { type BaseMessage } from "@langchain/core/messages";
import { isAIMessage, ToolMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import { HumanMessage } from "@langchain/core/messages";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  maxOutputTokens: 2048,
});

// Define tools
const add = tool(({ a, b }) => a + b, {
  name: "add",
  description: "Add two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const multiply = tool(({ a, b }) => a * b, {
  name: "multiply",
  description: "Multiply two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const divide = tool(({ a, b }) => a / b, {
  name: "divide",
  description: "Divide two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const createfile = tool(
  async ({ filePath, content }) => {
    const file = Bun.file(filePath);
    await Bun.write(file, content);
    return `File created successfully at ${filePath}`
  }, {
  name: "creates_new_file",
  description: "Creates new file and adds content to it",
  schema: z.object({
    filePath: z.string(),
    content: z.string()
  })
})
// Augment the LLM with tools
const toolsByName = {
  [add.name]: add,
  [multiply.name]: multiply,
  [divide.name]: divide,
  [createfile.name]: createfile
};
// console.log("tools by object", toolsByName);

const tools = Object.values(toolsByName);
const llmWithTools = llm.bindTools(tools);

// Step 2: Define state
const MessagesState = z.object({
  messages: z
    .array(z.custom<BaseMessage>())
    .register(registry, MessagesZodMeta),
  llmCalls: z.number().optional(),
});

// Step 3: Define model node
async function llmCall(state: z.infer<typeof MessagesState>) {
  // console.log("state while on llm call", MessagesState);

  return {
    messages: await llmWithTools.invoke([
      new SystemMessage(
        "You are a helpful assistant tasked with performing arithmetic on a set of inputs. when user ask to create a file dont ask for filename it will be given in the tools argument just use the tool"
      ),
      ...state.messages,
    ]),
    llmCalls: (state.llmCalls ?? 0) + 1,
  };
}

// Step 4: Define tool node
async function toolNode(state: z.infer<typeof MessagesState>) {
  const lastMessage = state.messages.at(-1);

  // console.log("state while on toolNode", MessagesState);
  if (lastMessage == null || !isAIMessage(lastMessage)) {
    return { messages: [] };
  }

  const result: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    // console.log("toolCall", toolCall);
    const tool = toolsByName[toolCall.name];
    // console.log("tool", tool);
    const observation = await tool.invoke(toolCall);
    result.push(observation);
  }

  return { messages: result };
}

// Step 5: Define logic to determine whether to end
async function shouldContinue(state: z.infer<typeof MessagesState>) {
  const lastMessage = state.messages.at(-1);
  if (lastMessage == null || !isAIMessage(lastMessage)) return END;

  // If the LLM makes a tool call, then perform an action
  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }

  // Otherwise, we stop (reply to the user)
  return END;
}

// Step 6: Build and compile the agent
const agent = new StateGraph(MessagesState)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "llmCall")
  .compile();

// Invoke
// const result = await agent.invoke({
//   messages: [new HumanMessage("Add 3 and 4. and display the final result in a file")],
// });
while (1) {

  var input = prompt("What would you like do next?")
  const result = await agent.invoke({
    messages: [new HumanMessage(input)],
  });
  for (const message of result.messages) {
    console.log(`[${message.getType()}]: ${message.text}`);
  }
  if (input === "quit") {
    break;
  }





}
// for (const message of result.messages) {
//   console.log(`[${message.getType()}]: ${message.text}`);
// }
