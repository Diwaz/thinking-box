import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { StateGraph, START, END, Command } from "@langchain/langgraph";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import { type BaseMessage } from "@langchain/core/messages";
import { isAIMessage, ToolMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import { HumanMessage } from "@langchain/core/messages";
import { SYSTEM_PROMPT } from "./prompt";
import type Sandbox from "@e2b/code-interpreter";


const MessageState = z.object({
  messages: z.array(z.custom<BaseMessage>()).register(registry, MessagesZodMeta),
  llmCalls: z.number().optional()
})

type State = z.infer<typeof MessageState>;


export async function runAgenticManager(userId:string,projectId:string,state:State,clients:Map<string,WebSocket>,sdx:Sandbox){

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
});


const createfile = tool(
  async ({ filePath, content }) => {
    // const file = Bun.file(filePath);
    try {
      await sdx.files.write(filePath,content);
      send("creating file")
      return `File created successfully at ${filePath}`

    }catch(err){
      return `Unable to create file error: ${err}`
    }

  }, {
  name: "creates_new_file",
  description: "Creates new file and adds content to it",
  schema: z.object({
    filePath: z.string().describe("File path of the origin of the file"),
    content: z.string().describe("content or code to put inside file")
  })
})

const runShellCommands = tool (
  async ({ command }) => {
    send("entering command")
    try {
      await sdx.commands.run(command);
      console.log("cmd:",command);
      return ` command executed in the terminal successfully `;
    }catch(err){
      return `Command failed error: ${err}`
    }
  },{
    name : "run_shell_command",
    description:"runs the shell command given by AI in the terminal",
    schema: z.object ({
      command: z.string().describe("shell command to run in bash terminal")
    })
  }
)

const toolsByName = {
  [createfile.name]: createfile,
  [runShellCommands.name]: runShellCommands,
  // [applyPatchTool.name]:applyPatchTool
};

const tools = Object.values(toolsByName);
const llmWithTools = llm.bindTools(tools);



async function llmCall(state: State) {

  // if (state.llmCalls == 0){
    console.log("1st LLM CALLLLLLLL")
    send("running LLM")
  const llmResponse = await llmWithTools.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    ...state.messages
  ])

  const newCallCount = state.llmCalls + 1
  console.log("state of llmCalls",state.llmCalls)
  return {
    messages: [...state.messages, llmResponse],
    llmCalls: newCallCount,
  }
  send("LLM done")


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
      send("tool msg")
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

    const ws = clients.get(userId);

    const send = (msg) => {
        if (ws && ws.readyState === ws.OPEN){
            ws.send(JSON.stringify({
                message:msg
            }))
        }
    };

    send("Agent started")
    await agent.invoke(state)
    send("LLM DONE")



}