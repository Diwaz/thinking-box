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
import Sandbox from "@e2b/code-interpreter";
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
  llmCalls: z.number().default(0).optional(),
  hasSummazied: z.boolean().default(false),
  generatedFiles: z.array(z.object({
      fileName: z.string(),
      content: z.string(),
  })),
  hasValidated: z.boolean().default(false),
  errors: z.array(z.string()).optional(),
  validationAttempt: z.number().default(0),
})

const createFileSchema = z.object({
    filePath: z.string().describe("File path of the origin of the file"),
    content: z.string().min(1,"cannot be empty - you must provide the actual file content")
    .describe("content or code to put inside file")
  })

  const commandSchema = z.object ({
      command: z.string().describe("shell command to run in bash terminal")
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
    const result = createFileSchema.safeParse({filePath,content});
    if (!result.success){
      return `Unable to create file error : ${result.error}`
    }

    try {
    let fullPath:string;
    if (filePath.startsWith('/home/user/')){
      fullPath = filePath
    }else if(filePath.startsWith('/')){
      fullPath= `home/user${filePath}`;
    }else{
      fullPath= `home/user/${filePath}`;
    }
    const dir = fullPath.slice(0,fullPath.lastIndexOf('/'));
    await sdx.commands.run(`mkdir -p ${dir}`);

      await sdx.files.write(filePath,content);

       send({
      action: "LLM_UPDATE",
      message:`Created file ${filePath}`
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
  schema:createFileSchema 
})

const runShellCommands = tool (
  async ({ command }) => {
    const result = commandSchema.safeParse({command});
    if (!result.success){
      return `Command cannot be empty`
    }

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
      return ` ran this command : ${command} got this :${output.stderr ? output.stderr : output.stdout}`
    }catch(err){
      return `Command failed error: ${err}`
    }
  },{
    name : "run_shell_command",
    description:"runs the shell command given by AI in the terminal and you can also view the output of the command",
    schema:commandSchema 
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
  const messageWrapper: BaseMessage[] =[];
  // if (state.llmCalls == 0){
    console.log(`${state.llmCalls}th LLM CALLLLLLLL`)
 send({
      action: "LLM_UPDATE",
      message:"Evaluating Results"
    })
let dynamicPrompt = SYSTEM_PROMPT;
const contextFile =  Bun.file(`./Context/${projectId}.md`)
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
  messageWrapper.push(new SystemMessage(dynamicPrompt),...state.messages);
  const llmResponse = await llmWithTools.invoke(messageWrapper)
  
  const newCallCount = (state.llmCalls ?? 0) + 1
  console.log(`result of ${state.llmCalls}`,llmResponse.content)
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
async function checkForErrors(sdx:Sandbox,state:State): Promise<string[]>{
  const errors: string[]=[]

  try {

    // 1st phase to check ai not using tool_call to write msg
    const recentAIMessages = state.messages.filter(msg=> isAIMessage(msg));
    for (const aiMsg of recentAIMessages) {
  // Skip if this message has tool calls - it's already using tools
  if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
    continue;
  }
  
  // Only check messages without tool calls
  let content = '';
  
  if (typeof aiMsg.content === 'string') {
    content = aiMsg.content;
  } else if (Array.isArray(aiMsg.content)) {
    content = aiMsg.content
      .filter(item => item && typeof item === 'object' && 'text' in item)
      .map(item => item.text)
      .join('\n');
  }
  
  const hasCodeBlock = content.match(/```(javascript|typescript|jsx|tsx|html|css|json)[\s\S]*?```/g);
  if (hasCodeBlock && hasCodeBlock.length > 0) {
    console.log("VALIDATION ERROR: Code shown but create_new_file tool was not used");
    errors.push("Code was shown but create_new_file tool was not used - files not saved");
    break;
  }
}

    // phase 2 to verify there are no error on preview url 
    try {

    const uri = sdx.getHost(5173);
    await new Promise(r=>setTimeout(r,1000));
    const previewUrl = `https://${uri}/src/App.jsx?t=${Date.now()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(()=>controller.abort(),3000);

    const response = await fetch(previewUrl,{
      signal:controller.signal
    });
    clearTimeout(timeoutId);
    
    const body = await response.text();

    console.log("response from html",body)

    // checking error patterns in the preview page
   const errorPatterns = [
        "Failed to fetch dynamically imported module",
        "500 Internal Server Error",
        "Cannot GET",
        "404",
        "Module not found",
        "Failed to resolve import",
        "Unexpected token",
        "SyntaxError",
        "ReferenceError",
        "is not defined",
        "Cannot read propert",
        "undefined is not",
        "ENOENT",
        "[vite] Internal server error",
        "TypeError",
        "[plugin:vite",
      ];
      
      const hasError = errorPatterns.some(pattern => body.includes(pattern));
      if (hasError){
        errors.push("Preview shows error - check console for details");
      }
      
      // checking if the fileSize is very small
       if (response.ok && body.length < 100 && !body.includes("<!DOCTYPE")) {
        errors.push("Preview returned empty or minimal content");
      }


    }catch(err:any){
      console.log("error while checkig preview url",err)
       if (err.name === 'AbortError') {
        errors.push("Preview URL timeout - server may be unresponsive");
      } else {
        errors.push(`Cannot reach preview URL: ${err.message}`);
      }
    }


  }catch(err){
    console.log("error while checking error",err)
  }

  return errors
}
async function validationNode(state:State){
  
  const currentAttempts = state.validationAttempt || 0;
  send({
   action:"LLM_UPDATE",
   message:"Validating Code"
 })    

   const errors = await checkForErrors(sdx,state);


    if (errors.length >0){
      console.log("validation errors",errors);

      send({
        action:"LLM_UPDATE",
        message:"RESOLVING ERROR"
      })

      if (currentAttempts >= 2){
        console.log("Max validation attempts reached , proceeding anyway");

       send({
        action: "LLM_UPDATE",
        message: " Validation completed with warnings"
      });
      return {
        messages: state.messages,
        hasValidated:true,
        errors,
        validationAttempt: currentAttempts + 1

      }  
      }

      const reportingFromValidationNode = `
      VALIDATION FAILED (Attempt ${currentAttempts + 1}/2):

Errors detected:
${errors.map((err, i) => `${i + 1}. ${err}`).join('\n')}

IMMEDIATE ACTIONS REQUIRED:

${errors.some(e => e.includes('Code was shown but create_new_file')) ? `
** CRITICAL: You showed code but didn't save it!
 Use create_new_file tool RIGHT NOW for every file you mentioned
 File paths must start with /home/user/ (e.g., /home/user/src/App.jsx)
` : ''}

${errors.some(e => e.includes('Preview shows error')) ? `
**  The preview has runtime errors!
 Check your code for syntax errors, missing imports, or undefined variables
 Fix and re-save all affected files using create_new_file
` : ''}
      `
    return {
      messages: [ new AIMessage(reportingFromValidationNode),
        ...state.messages
      ],
      hasValidated: false,
      errors,
      validationAttempt:currentAttempts + 1
    }
    }

    // Validation passed state
  console.log("Validation successful!");
  send({
    action: "LLM_UPDATE",
    message: "File validated successfully"
  });

    return {
      messages: state.messages,
      hasValidated: true,
      errors:[],
      validationAttempt: currentAttempts
    }
}
// dummy summarizing node 
async function summarizingNodeDummy(state:State){
  console.log("summarizing");
  return {
    messages: state.messages,
    hasSummarized: true,
  }
}

async function summarizingNode(state:State){

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
    // state.hasSummazied = true;
    return {
      messages: state.messages,
      generatedFile:  [],
      hasSummarized: true,
    }

  }catch(err){
    console.log("Error while saving file");
    state.hasSummazied = false;
    return {
      messages:[new AIMessage('SUMMARY FAILED'),...state.messages],
      hansSummarized: false,
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
  const lastMessage = state.messages.at(-1);
  const llmFinalResponse = {
    content: lastMessage!["content"] ?? "Final Resp"
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
  if (!state.hasValidated){
    return "validationNode"
  }
  if (!state.hasSummazied){
    return "summarizer";
  }
  return END;
}

const agent = new StateGraph(MessageState)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addNode("summarizer", summarizingNodeDummy)
  .addNode("finalNode", finalNode)
  .addNode("validationNode", validationNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode","summarizer","validationNode", END])
  .addEdge("toolNode", "llmCall")
  .addEdge("validationNode", "llmCall")
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