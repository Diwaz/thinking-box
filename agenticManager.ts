import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI, OpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { StateGraph, START, END, Command } from "@langchain/langgraph";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { isAIMessage, ToolMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import { HumanMessage } from "@langchain/core/messages";
import {  FINAL_AI_RESPONSE_SYSTEM_PROMPT, INPUT_VALIDATION_PROMPT, PROMPT_ENHANCER_SYSTEM_PROMPT, SUMMARIZER_PROMPT, SYSTEM_PROMPT } from "./prompt";
import Sandbox from "@e2b/code-interpreter";
import { backupDataToBucket } from "./bucketManager";
import { getFiles } from ".";
import { secureCommand } from "./guardrails";
import { PrismaClient } from "./generated/prisma";
import { ConversationType } from "./generated/prisma";
import { MessageFrom } from "./generated/prisma";
import { appendFile } from "fs/promises";
import { ChatAnthropic } from "@langchain/anthropic";

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
  hasEnhancedPrompt:z.boolean().default(false).optional(), 
  hasValidPrompt:z.boolean().default(false).optional(),
  projectTitle: z.string().optional()
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


export async function runAgenticManager(userId:string,projectId:string,conversationState:State,clients:Map<string,WebSocket>,sdx:Sandbox){
  conversationState.hasSummazied = false;
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash", 
});

const openAi = new ChatOpenAI({
  model:'gpt-5.2',
})


const anthropic = new ChatAnthropic({
  model:"claude-sonnet-4-5-20250929",
  temperature:0,
})


const createfile = tool(
  async ({ filePath, content }) => {
    // const file = Bun.file(filePath);
    const result = createFileSchema.safeParse({filePath,content});
    if (!result.success){

    return JSON.stringify({
      success:false,
        error: `Tool call validation failed. Missing or invalid parameters: ${result.error}. You MUST provide both 'filePath' and 'content' parameters. The 'content' parameter cannot be empty and must contain the actual file content.`,
        requiredParameters:{
          filePath:"string - a file path",
          content: "string (min 1 char) - the complete file content"
        }
    })
    }


    console.log("successfully parsed the tool call input")

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
        console.log("sending this file ",fullPath)
       send({
      action: "FILE_CREATION_UPDATE",
      message:`${fullPath}`
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
const OpenAiWithTools = openAi.bindTools(tools);
const AnthropicWithTools = anthropic.bindTools(tools);

async function llmCall(state: State) {
    send({
      action: "BUILDING",
      // message:"Running Terminal Command"
    })
  const messageWrapper: BaseMessage[] =[];
  // if (state.llmCalls == 0){
    console.log(`${state.llmCalls}th LLM CALLLLLLLL`)
    console.log("messages till now",state.messages)
    try {
      
    //   send({
    //     action: "LLM_UPDATE",
    //     message:"Evaluating Results"
    // })
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
  // const llmResponse = await llmWithTools.invoke(messageWrapper)
  const llmResponse = await AnthropicWithTools.invoke(messageWrapper)
  // const llmResponse = await OpenAiWithTools.invoke(messageWrapper)
  // if (llmResponse.tool_calls?.length == 0){
  //   const messageSegment = llmResponse.content;
  //   if (typeof(messageSegment)==="string" && messageSegment.length < 200){
  //     send({
  //       action:"LLM_UPDATE",
  //       message:messageSegment
  //     })
  //   }
  // } 
  const newCallCount = (state.llmCalls ?? 0) + 1
  conversationState.llmCalls = newCallCount;
  console.log(`result of ${state.llmCalls}`,llmResponse)
  // state.messages.push(llmResponse.content)
  
  return {
    messages: [...state.messages, llmResponse],
    llmCalls: newCallCount,
  }
}catch(err){
  console.log("Error while llm call",err);
  return {
    messages:[...state.messages,new AIMessage("Sorry the LLM is not responding right now try again later")]
  }
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
      if (!tool) {
        result.push(
          new ToolMessage({
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: false,
              error:"Tool Not Found"
            })
          })
        )
        continue;
      }
      let observation;
      try {

        observation = await tool.invoke(toolCall);
        try {
          const obsResult = JSON.parse(observation["content"]);
          if (!obsResult.success && obsResult.error){
            console.log("Tool call failed validation",obsResult.error);
          }
        }catch(e){
          // Not JSON
          console.log("JSON parsing error retrying");
        }
      }catch(e){
        console.log("failed while invoking the toolcall",e);
        observation = {
          content: JSON.stringify({
            success:false,
            error: `Tool invocation error: ${e instanceof Error ? e.message : "Unknown error"}`
          })
        }
      }
      // console.log("tool msg",observation["content"])

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
    //      send({
    //   action: "LLM_UPDATE",
    //   message:"Using Tools"
    // })
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
  if (hasCodeBlock && hasCodeBlock.length > 0 && state.generatedFiles.length < 1) {
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

    // console.log("response from html",body)

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
      send({
      action: "DELIVERING",
      // message:"Running Terminal Command"
    })
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


  let llmSummaryResponse;
  let rawCode:string =""
  try {
  const codeSummary = state.generatedFiles;
  // console.log("summarizer problemo?",codeSummary)
  if (codeSummary.length > 0){
      rawCode = codeSummary.map((item)=>{
        return `###FileName  ${item.fileName} \n\n ##CODE## ${item.content} \n\n`
      }).join("\n\n")
    }
    // console.log("RAW CODE",rawCode)
     llmSummaryResponse = await llm.invoke([
      new SystemMessage(SUMMARIZER_PROMPT),
      ...state.messages
    ])
    
  }catch(err){
    console.log("Error facing while summarizing LLM call");
    return {
        messages:[...state.messages,new AIMessage("LLM not working to summaring text")],
        hasSummaried:true,
    }
  }
    
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
    
    // console.log("SUMMARY variable",summary)
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
    return {
      messages:[new AIMessage('SUMMARY FAILED'),...state.messages],
      hansSummarized: true,
    }
    
  }
}
function containsInputValidationError(text:string){
  if (!text || typeof text !== 'string') return false;

  const normalizedText = text.toLowerCase();

  const keywords = ["input","validation","error"];

  const allKeywordPresent = keywords.every(keyword => normalizedText.includes(keyword));

  return allKeywordPresent;

}

async function inputValidation(state:State){
  try {
     send({
      action: "THINKING",
      // message:"Running Terminal Command"
    })
    if (conversationState.hasValidPrompt === true){
         return {
          messages:state.messages,
          hasValidPrompt:true,
      }
    }else{
      const userMessage = state.messages.filter(msg => msg._getType() === "human");
      console.log("user messages",userMessage)
      const llmInputValidation = await llm.invoke([
      new SystemMessage(INPUT_VALIDATION_PROMPT),
      ...userMessage
    ])

    if (typeof llmInputValidation["content"] === "string"){
      console.log("llm response of validating prommpt",llmInputValidation["content"]);
      const isInvalid = containsInputValidationError(llmInputValidation["content"]);
      console.log("is valid result",isInvalid);
      if (!isInvalid){
      const title = llmInputValidation["content"];
            send({
      action: "TITLE_UPDATE",
      title:title
    })
        conversationState.hasValidPrompt = true;
        conversationState.projectTitle = title;
        return {
          projectTitle: title,
          messages:state.messages,
          hasValidPrompt:true,
        }
      }else{
        send({
            action:"LLM_UPDATE",
            message:"Sorry your request cannot be proceed further please input relevant query"
          })
        }
        
      }
      
    } 
  }catch(err){
    console.log("LLM not responding while validating input",err)
    
  }
}
async function enhancedPromptNode(state:State){

const userMessage  = state.messages.filter(msg => msg._getType() === "human");


 try {
  const enhancedPrompt = await llm.invoke([
      new SystemMessage(PROMPT_ENHANCER_SYSTEM_PROMPT),
      ...userMessage
    ])
    if (typeof enhancedPrompt["content"] === "string"){
      conversationState.hasEnhancedPrompt = true
      return {
        hasEnhancedPrompt: true,   
        messages: new AIMessage(enhancedPrompt["content"]) 
      }
    }
 }catch(err){

    console.log("LLM not responding while enhancing input",err)
 } 
}
async function shouldStartBuilding(state:State){
  if (!state.hasValidPrompt){
      return END
  }
  if (!state.hasEnhancedPrompt){
    return `enhancedPromptNode`
  }
  return 'llmCall';
}

const getNonEmptyAiMsg = (state:State) : string | boolean =>{
      let fullLastMsg:string='';
      const lastMessage = state.messages.at(-1);
      console.log("LETZ SEE tHE FINAL MSG",lastMessage)
      if (isAIMessage(lastMessage)){
        console.log("yes ai")
        if (Array.isArray(lastMessage.content)){
        fullLastMsg =lastMessage.content.map((part)=>{
            return part.text
  }).join("\n")
        }else{
          fullLastMsg = lastMessage.content
        }
        console.log("last msg",fullLastMsg)
        return fullLastMsg
      }
     return false; 
    }



async function finalNode(state:State){

try {
let llmFinalResponse;
  const finalMessage = getNonEmptyAiMsg(state);
  
  console.log("reached final node");
  if (finalMessage){
    llmFinalResponse = {
      content: finalMessage
    }
  }else{
    console.log("message not found need to generate")
    const conversationMessages = state.messages.filter(
      msg => msg._getType() === 'human' || msg._getType() === 'ai'
    );
    
    llmFinalResponse = await llm.invoke([
      new SystemMessage(FINAL_AI_RESPONSE_SYSTEM_PROMPT),
      ...conversationMessages
    ])
  }
  console.log("generated finalNode Msg",llmFinalResponse)

  // const lastMessage = state.messages.at(-1);
  // const llmFinalResponse = {
  //   content: lastMessage!["content"] ?? "Final Resp"
  // }
  console.log("final Message which should be appear",llmFinalResponse) 
  return {
    messages: [...state.messages,new AIMessage(llmFinalResponse["content"])]
  }
}catch(err){
  return {
    messages: [...state.messages,"ERROR GENERATING FINAL RESPONSE"]
  }
}




}
async function isCodeValid(state:State){
  if (state.hasValidated === true && state.hasSummazied === false){
    return "summarizer"
  }
  if (state.hasValidated === false){
    return "llmCall"
  }
  return "finalNode"
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
  // if (!getNonEmptyAiMsg(state)){
  //   return "finalNode" 
  // }
  // if (!state.hasSummazied){
  //   return "summarizer";
  // }
  return END;
}

const agent = new StateGraph(MessageState)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addNode("summarizer", summarizingNode)
  .addNode("finalNode", finalNode)
  .addNode("validationNode", validationNode) 
  .addNode("inputValidationNode", inputValidation)
  .addNode("enhancedPromptNode", enhancedPromptNode)
  .addEdge(START, "inputValidationNode")
  .addConditionalEdges("inputValidationNode",shouldStartBuilding,["enhancedPromptNode","llmCall",END])
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode","validationNode", END])
  .addConditionalEdges("validationNode", isCodeValid, ["summarizer","llmCall","finalNode"])
  .addEdge("enhancedPromptNode", "llmCall")
  .addEdge("toolNode", "llmCall")
  .addEdge("summarizer","finalNode")
  .addEdge("finalNode", END)
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
    // send({
    //   action: "LLM_UPDATE",
    //   message:"Agent started"
    // })
    const result = await agent.invoke(conversationState,{recursionLimit:40})
    // console.log("RESULT messages",result.messages)
    
    // start to upload to s3
    // console.log("last AI MSG",result.messages.at(-1).content);
    // const lastMessage = result.messages.at(-1).content;
    const lastMessage = getNonEmptyAiMsg(result);
    console.log("result extracted from final node",lastMessage)
    if (conversationState.hasValidPrompt){
      const isBackup = await backupDataToBucket(sdx,userId,projectId); 

      if (isBackup){
        const files = await getFiles(sdx);
        send({
          action: "BUCKET_UPDATE",
          files
        })
      }
    }

   if (typeof(lastMessage)==="string"){

    send({
      action: "LLM_UPDATE",
      message:lastMessage
    })

    try {
      if (conversationState.projectTitle){
      await prisma.project.update({
        where :{
        id: projectId
        },
        data:{
          title: conversationState.projectTitle
        }
      })
      }

       await prisma.conversationHistory.create({
    data:{
      projectId,
      type: ConversationType.TEXT_MESSAGE,
      messageFrom:MessageFrom.ASSISTANT,
      contents: lastMessage,
    }
  })
    }catch(err){
      console.log("Error while saving to db",err)
    }
    }
 

    console.log("LLM Done")



}