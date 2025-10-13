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
  maxOutputTokens: 2048
});

const add = tool(({ a, b }) => a + b, {
  name: "add",
  description: "add two numbers",
  schema: z.object({
    a: z.number().describe("First Number"),
    b: z.z.number().describe("Second Number")
  }),
})

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

const toolsByName = {
  [add.name]: add,
  [createfile.name]: createfile
};

const tools = Object.values(toolsByName);
const llmWithTools = llm.bindTools(tools);


const MessageState = z.object({
  messages: z.array(z.custom<BaseMessage>()).register(registry, MessagesZodMeta),
  llmCalls: z.number().optional()
})

type State = z.infer<typeof MessageState>;

async function llmCall(state: State) {

  const llmResponse = await llmWithTools.invoke([
    new SystemMessage(
      "You are a helpful assistant tasked with performing arithmetic on a set of inputs. when user ask to create a file dont ask for filename it will be given in the tools argument just use the tool"
    ),
    ...state.messages
  ])

  return {
    messages: [...state.messages, llmResponse],
    llmCall: (state.llmCalls ?? 0) + 1,
  }

}

async function toolNode(state: State) {
  const lastMessage = state.messages.at(-1);

  if (lastMessage == null || !isAIMessage(lastMessage)) {
    return {
      messages: [],
    }
  }

  const result: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];
    if (!tool) continue;
    const observation = await tool.invoke(toolCall);
    result.push(
      new ToolMessage({
        tool_call_id: toolCall.id,
        content:observation
      })
    );

  }

  return {
    messages: result
  }

}
async function shouldContinue(state: State) {
  const lastMessage = state.messages.at(-1);
  if (lastMessage == null || !isAIMessage(lastMessage)) {
    return END
  }

  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }
  return END;
}

const agent = new StateGraph(MessageState)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "llmCall")
  .compile();

const start_agent = async () => {
  let state:State = {
    messages: []
  }
  while (true) {
    let inputFromUser = prompt("[You]:")

    if (inputFromUser?.toLowerCase() === "quit"){
      break;
    }
    if (!inputFromUser?.trim()){
      continue
    }
    state.messages.push(new HumanMessage(inputFromUser))
    const result = await agent.invoke(state)
    state = result

    for (const messages of state.messages) {
      // console.log("state messages",state.messages)
      console.log(`[${messages._getType()}]:${messages.content}`);

    }




  }



}
start_agent();
