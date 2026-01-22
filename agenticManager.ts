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
import { backupDataToBucket, uploadDir } from "./bucketManager";
import { getFiles } from ".";
import { secureCommand } from "./guardrails";
import { PrismaClient } from "./generated/prisma";
import { ConversationType } from "./generated/prisma";
import { MessageFrom } from "./generated/prisma";


const prisma = new PrismaClient();



const MessageState = z.object({
  messages: z.array(z.custom<BaseMessage>()).register(registry, MessagesZodMeta),
  llmCalls: z.number().optional()
})

type State = z.infer<typeof MessageState>;


export async function runAgenticManager(userId:string,projectId:string,state:State,clients:Map<string,WebSocket>,sdx:Sandbox){

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
});


const createfile = tool(
  async ({ filePath, content }) => {
    // const file = Bun.file(filePath);
    try {
      await sdx.files.write(filePath,content);
       send({
      action: "LLM_UPDATE",
      message:"Creating File"
    })
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
 send({
      action: "LLM_UPDATE",
      message:"Running Terminal Command"
    })

    try {
        secureCommand(command);
      const output = await sdx.commands.run(command,{
        onStdout: (data)=> {
          console.log("command success output:",data)
          // return `output from command: ${data}`
        },
        onStderr:(data)=>{ 
          console.log("command failed output:",data)
          // return `output from command: ${data}`
        },
      });
      console.log("cmd:",output);
      return ` ran this command : ${command} got this :${output}`
    }catch(err){
      return `Command failed error: ${err}`
    }
  },{
    name : "run_shell_command",
    description:"runs the shell command given by AI in the terminal and you can also view the output of the command",
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
 send({
      action: "LLM_UPDATE",
      message:"Analyzing query"
    })
  const llmResponse = await llmWithTools.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    ...state.messages
  ])

  const newCallCount = state.llmCalls + 1
  console.log("state of llmCall",llmResponse.content)
  return {
    messages: [...state.messages, llmResponse],
    llmCalls: newCallCount,
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
      console.log("tool msg",observation["content"])
         send({
      action: "LLM_UPDATE",
      message:"Using Tools"
    })
    result.push(
      new ToolMessage({
        tool_call_id: toolCall.id,
        content:observation["content"]
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
    console.log("agent started")
    send({
      action: "LLM_UPDATE",
      message:"Agent started"
    })
    const result = await agent.invoke(state)
    // start to upload to s3
    console.log("last AI MSG",result.messages.at(-1).content);
    const lastMessage = result.messages.at(-1).content;

    if (typeof(lastMessage)==="string"){

    send({
      action: "LLM_UPDATE",
      message:lastMessage
    })
    }

    const isBackup = await backupDataToBucket(sdx,userId,projectId); 
    if (isBackup){
      const files = await getFiles(sdx);
      send({
        action: "BUCKET_UPDATE",
        files
      })
    }

  await prisma.conversationHistory.create({
    data:{
      projectId,
      type: ConversationType.TEXT_MESSAGE,
      messageFrom:MessageFrom.ASSISTANT,
      contents: lastMessage
    }
  })

    console.log("LLM Done")



}