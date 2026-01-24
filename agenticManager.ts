import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { StateGraph, START, END, Command } from "@langchain/langgraph";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { isAIMessage, ToolMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import { HumanMessage } from "@langchain/core/messages";
import {  FINAL_AI_RESPONSE_SYSTEM_PROMPT, SUMMARIZER_PROMPT, SYSTEM_PROMPT } from "./prompt";
import type Sandbox from "@e2b/code-interpreter";
import { backupDataToBucket } from "./bucketManager";
import { getFiles } from ".";
import { secureCommand } from "./guardrails";
import { PrismaClient } from "./generated/prisma";
import { ConversationType } from "./generated/prisma";
import { MessageFrom } from "./generated/prisma";
import { appendFile } from "fs/promises";


const prisma = new PrismaClient();



const MessageState = z.object({
  messages: z.array(z.custom<BaseMessage>()).register(registry, MessagesZodMeta),
  llmCalls: z.number().optional(),
  hasSummazied: z.boolean().default(false),
  generatedFiles: z.array(z.object({
      fileName: z.string(),
      content: z.string(),
  }))
})

type State = z.infer<typeof MessageState>;


export async function runAgenticManager(userId:string,projectId:string,state:State,clients:Map<string,WebSocket>,sdx:Sandbox){
  state.hasSummazied = false;
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
});


const createfile = tool(
  async ({ filePath, content }) => {
    // const file = Bun.file(filePath);
    try {
      await sdx.files.write(filePath,content);
      // state.generatedFiles.push({
      //   fileName: filePath,
      //   content
      // })
       send({
      action: "LLM_UPDATE",
      message:"Creating File"
    })
      return JSON.stringify({
        success: true,
        filePath,
        content,
        message:`File created at ${filePath}`
      })

    }catch(err){
      return `Unable to create file error: ${err}`
    }

  }, {
  name: "create_new_file",
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
      message:"Evaluating Results"
    })
let dynamicPrompt = SYSTEM_PROMPT;
const contextFile = await Bun.file(`./Context/${projectId}.md`)
if (await contextFile.exists()){

  console.log("retrieved context")
    dynamicPrompt = `
     ## CONTEXT FROM PREVIOUS CONVERSATION:
     ${await contextFile.text()}

## IMPORTANT:
    The above context contains the COMPLETE current state of all files. When the user asks for changes:
    1. Read the current code from the context above
    2. Make ONLY the specific changes requested
    3. Keep everything else exactly the same
    4. Use create_file to write the COMPLETE updated file (not just the changed parts)

    The user is now making a follow-up request below.
      ${SYSTEM_PROMPT}    `
  }
  const llmResponse = await llmWithTools.invoke([
    new SystemMessage(dynamicPrompt),
    ...state.messages
  ])
  
  const newCallCount = state.llmCalls + 1
  console.log("state of llmCall",llmResponse.content)
  // state.messages.push(llmResponse.content)
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
      generatedFiles: state.generatedFiles
    }
  }

  const result: ToolMessage[] = [];
  const newGeneratedFiles = [...state.generatedFiles];
  for (const toolCall of lastMessage.tool_calls ?? []) {
      const tool = toolsByName[toolCall.name];
      if (!tool) continue;
      const observation = await tool.invoke(toolCall);
      console.log("tool msg",observation["content"])

      if (toolCall.name === "create_new_file"){
        try {
          const result = JSON.parse(observation["content"]);
          if (result.success){
            newGeneratedFiles.push({
              fileName: result.filePath,
              content: result.content
            })
          }
        }catch(e){
          console.log("error parsing ?",e)
        }
      }
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
    messages: result,
    generatedFiles: newGeneratedFiles
  }

}

async function summazingNode(state:State){

const codeSummary = state.generatedFiles;
// console.log("summarizer problemo?",codeSummary)
    let rawCode:string =""
    if (codeSummary.length > 0){
      rawCode = codeSummary.map((item)=>{
        return `###FileName  ${item.fileName} \n\n ##CODE## ${item.content} \n\n`
      }).join("\n\n")
    }
    console.log("RAW CODE",rawCode)
    const llmSummaryResponse = await llm.invoke([
    new SystemMessage(SUMMARIZER_PROMPT),
    ...state.messages
  ])

    
  try {
    let summary:string="";
    if (Array.isArray(llmSummaryResponse["content"])){
      llmSummaryResponse["content"].map((part)=>{
        summary = summary + part["text"];
      })
    }else if (typeof(llmSummaryResponse["content"])==="object"){
      summary = summary + llmSummaryResponse["content"]["text"];
    }else{
      summary = summary + llmSummaryResponse["content"];
    }
    
    console.log("SUMMARY variable",summary)
    // console.log("SUMMARY raw",llmSummaryResponse)

    const file =Bun.file(`./Context/${projectId}.md`)
    
    if (await file.exists()){
      await appendFile(`./Context/${projectId}.md`,`\n\n----\n${summary}`);
      await appendFile(`./Context/${projectId}.md`,`\n\n----\n${rawCode}`)
    }else{
      await Bun.write(`./Context/${projectId}.md`,summary);
      await appendFile(`./Context/${projectId}.md`,`\n\n----\n${rawCode}`)
    }
    state.hasSummazied = true;
    return {
      messages: state.messages,
      generatedFile:  [],
    }

  }catch(err){
    console.log("Error while saving file");
    state.hasSummazied = false;
    return {
      messages:[...state.messages,new SystemMessage('SUMMARY FAILED')]
    }
    
  }
}

async function finalNode(state:State){

try {

  const conversationMessages = state.messages.filter(
      msg => msg._getType() === 'human' || msg._getType() === 'ai'
    );

  // const llmFinalResponse = await llm.invoke([
  //   new SystemMessage(FINAL_AI_RESPONSE_SYSTEM_PROMPT),
  //   ...conversationMessages
  // ])
  const llmFinalResponse = {
    content: "This is final Response"
  }
  
  return {
    messages: [...state.messages,new AIMessage(llmFinalResponse["content"])]
  }
}catch(err){
  return {
    messages: [...state.messages,"ERROR GENERATING FINAL RESPONSE"]
  }
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
  if (!state.hasSummazied){
    return "summarizer";
  }
  return END;
}

const agent = new StateGraph(MessageState)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addNode("summarizer", summazingNode)
  .addNode("finalNode", finalNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode","summarizer", END])
  .addEdge("toolNode", "llmCall")
  .addEdge("summarizer", "finalNode")
  .addEdge("finalNode",END)
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
    // console.log("RESULT messages",result.messages)
    
    // start to upload to s3
    console.log("last AI MSG",result.messages.at(-1).content);
    const lastMessage = result.messages.at(-1).content;

 

    const isBackup = await backupDataToBucket(sdx,userId,projectId); 
    if (isBackup){
      const files = await getFiles(sdx);
      send({
        action: "BUCKET_UPDATE",
        files
      })
    }
   if (typeof(lastMessage)==="string"){

    send({
      action: "LLM_UPDATE",
      message:lastMessage
    })
    try {
       await prisma.conversationHistory.create({
    data:{
      projectId,
      type: ConversationType.TEXT_MESSAGE,
      messageFrom:MessageFrom.ASSISTANT,
      contents: lastMessage
    }
  })
    }catch(err){
      console.log("Error while saving to db",err)
    }
    }
 

    console.log("LLM Done")



}