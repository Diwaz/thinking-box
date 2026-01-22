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
import {exec} from "child_process"
import { applyPatch, createPatch } from "diff";
import { Sandbox } from '@e2b/code-interpreter'
import express from 'express';
import cors from 'cors';
import { WebSocket, WebSocketServer } from "ws";
import { PrismaClient } from "./generated/prisma";
import { createServer } from "http";
import { runAgenticManager } from "./agenticManager";
import { validateSchema } from "./lib/validate";
import { isObjectExist, loadProjectFromBucket } from "./bucketManager";
import { ConversationType } from "./generated/prisma";
import { MessageFrom } from "./generated/prisma";


const app = express();

const server = createServer(app);
const wss = new WebSocketServer({server})

app.use(express.json());
app.use(cors());


interface ProjectStore {
  messages:[],
  llmCalls:number
}

const SANDBOX_TIMEOUT = 120_000;

const prisma = new PrismaClient();

const MessageState = z.object({
  messages: z.array(z.custom<BaseMessage>()).register(registry, MessagesZodMeta),
  llmCalls: z.number().optional()
})


type State = z.infer<typeof MessageState>;
type UserStore = Record<string,State>
type GlobalStore = Record<string,UserStore>
type activeSandboxes = Record<string,SandboxStore>


const globalStore:GlobalStore = {}

// {
  //   "user1": {
    //     "project-x0x": {
      //       messages : [
        //         {
          //           "ai msg":"file created"
          //         },
          
          //         {
            //           "human msg":"do dis"
            //         }
            //       ]
            //     }
            //   }
// }
export const getFiles = async (sdx:Sandbox)=>{

     const result = await sdx.commands.run(
            'find /home/user/src -type f 2>/dev/null || echo ""',
            { cwd: '/home/user' }
        );

        const filePaths = result.stdout.split('\n').filter(p=>p.trim() && p.startsWith('/home/user/src'));

        const files = await Promise.all(
            filePaths.map(async(path)=>{
                try {
                    const content = await sdx.files.read(path);
                    return{
                        path:path,
                        content:content.toString()
                    };
                } catch (error) {
                    console.error(`Error reading ${path}:`, error)
                    return null 
                }
            })
        )
        return files
}

const baseProjectParser = z.object({
  userId: z.uuid(),
  projectId: z.uuid(),
})

const createProjectParser = baseProjectParser.extend({

  initialPrompt: z.string().min(1,{message:"String must be at least 5 character long"})
})

const createPromptParser = baseProjectParser.extend({
  
  prompt: z.string().min(1,{message:"String must be at least 5 character long"})
})
app.post('/project',async(req,res)=>{
  try{
    
    const body = validateSchema(createProjectParser)(req.body);
    const {userId,projectId,initialPrompt}= body;
    const response =  await prisma.project.create({
      data:{
        id:projectId,
        initialPrompt,
        userId, 
      }
    })
    console.log("/project response",response)

  return res.status(200).json({
    "msg":response
  });
  }catch(err){
    return res.status(400).json(err)
  }

})

app.get("/project/:id",async(req,res)=>{
  const {id} = await req.params;
  try {
    const projectData = await prisma.project.findFirst({
      where: {
        id
      },
      select:{
        id:true,
        title:true,
        initialPrompt:true,
        userId:true,
        conversationHistory:true
      }
    })
    res.status(200).json(projectData);

  }catch(err){
    console.log("err",err)
    res.status(404).json({
      "not found":err
    })
  }
})


app.get("/project/history/:id",async(req,res)=>{
  const {id} = await req.params;
  try {
    // const projectData = await prisma.project.findFirst({
    //   where: {
    //     id
    //   },
    //   select:{
    //     id:true,
    //     title:true,
    //     initialPrompt:true,
    //     userId:true,
    //     conversationHistory:true
    //   }
    // })
   const sandboxId = await getSandboxId(id);
     if (!sandboxId){
      return res.status(404).json({
        error: "Unable to create Sandbox at the moment"
      })
    }

  
    const sdx = await Sandbox.connect(sandboxId);

    const files = await getFiles(sdx);

        const host = sdx.getHost(5173);
    res.status(200).json({
      success: true,
      // conversation: projectData,
      fileContent: files,
      uri: `https://${host}`
    });

  }catch(err){
    console.log("err",err)
    res.status(404).json({
      success: false,
      Error:err
    })
  }
})



const state:State ={
  messages:[],
  llmCalls:0,
}

app.post("/prompt",async (req,res)=>{
  try {

    const body = validateSchema(createPromptParser)(req.body);
    const {prompt,projectId,userId} = body;
    console.log("reached here w/ prompt",prompt)
    // const prompt = await projectData.initialPropmt
    
    if(!globalStore.userId){
      globalStore.userId={
        projectId :{
          messages:[],
          llmCalls:0
        }
      }
    }

    
    const projectState:State = globalStore.userId.projectId!
    
    const sandboxId = await getSandboxId(projectId);
     if (!sandboxId){
      return res.status(404).json({
        error: "Unable to create Sandbox at the moment"
      })
    }
    console.log("state of active Sandboxes",activeSanbox); 

    // activeSanbox.set(projectId,payload)
  
    const sdx = await Sandbox.connect(sandboxId);
    const host = sdx.getHost(5173);

   try {
    await prisma.conversationHistory.create({
        data: {
          projectId,
          contents: prompt,
          messageFrom: MessageFrom.USER,
          type: ConversationType.TEXT_MESSAGE
        }
    }) 
   }catch(err){
    res.status(400).json({
      success: false,
      error:err
    })
   } 

    projectState.messages.push(new HumanMessage(prompt))
    runAgenticManager(userId,projectId,projectState,clients,sdx);
    // const result = await agent.invoke(projectState)
    
    
    res.status(200).json({
      //  url:host,
      // messages:result.messages,
      status:"processing",
      uri: `https://${host}`
    })
  }catch(err){
    res.status(400).json({
      error:err
    })
  }

})
const clients = new Map();

// type activeUser = Record<string,SandboxStore>
interface SandboxStore{
  sandboxId: string
  sandboxInitTime: number
}
const activeSanbox = new Map<string,SandboxStore>();
const pendingCreations = new Map<string,Promise<string>>();

const getSandboxId = async (projectId: string): Promise<string | undefined> =>{

  const hasObj = activeSanbox.has(projectId);

  if (hasObj){

    const currentTime = Date.now();
    const project = activeSanbox.get(projectId);
    const startTime = Number(project?.sandboxInitTime);
    if ( currentTime - startTime < SANDBOX_TIMEOUT){
      console.log(" Returning Existing active sandbox");
      return project?.sandboxId;
    }
    console.log("Deleting prev sandbox and creating new one ...");
    activeSanbox.delete(projectId);

  }
  if (pendingCreations.has(projectId)){
    console.log("Creation already in progress, Joining ...");
    return await pendingCreations.get(projectId);
  }
  const creationPromise = (async()=>{
      console.log("creating new sandbox creation...");
      const sdx = await Sandbox.create(process.env.E2B_SANDBOX_TEMPLATE!,{
        timeoutMs : SANDBOX_TIMEOUT,
      })
      const info = await sdx.getInfo();

      activeSanbox.set(projectId,{
        sandboxId:info.sandboxId,
        sandboxInitTime: Date.now(),
      })

      console.log("created new sandbox with id:",info.sandboxId);

      if (await isObjectExist(projectId)){
         loadProjectFromBucket(sdx,projectId) 
      }
      return info.sandboxId;
  })();

  // Register the promise in pending map
  pendingCreations.set(projectId,creationPromise);

  try {
      return await creationPromise;
  }catch(err){
    console.log("Failed to create sandbox",err);
    throw err;
  }finally {
    pendingCreations.delete(projectId);
  }

}

//   const hasObj =   activeSanbox.has(projectId);
//   console.log("do we already have this sandbox",hasObj)
//   if (!hasObj){
//     const sdx = await Sandbox.create(process.env.E2B_SANDBOX_TEMPLATE!,{
//       timeoutMs: 120_000,
//       // timeoutMs:1800_000,
//     })
//     const info = await sdx.getInfo()
//     console.log("created new sandbox",info.sandboxId);
//     activeSanbox.set(projectId,{
//       sandboxId:info.sandboxId,
//           sandboxInitTime: Date.now()
//         })
//         return info.sandboxId;       
//       }
      
//       const project = activeSanbox.get(projectId);
//       const startTime = Number(project?.sandboxInitTime)
//       const id = project?.sandboxId
//       // console.log("sandbox in objet",Object.keys(sandbox)[0])
      
//       const currentTime = Date.now()
//       if (currentTime - startTime > 1800_000){
//         activeSanbox.delete(projectId);
//         const sdx = await Sandbox.create(process.env.E2B_SANDBOX_TEMPLATE!,{
//           timeoutMs: SANDBOX_TIMEOUT,
//           // timeoutMs:1800_000,
//         })

//         const info = await sdx.getInfo();
//         activeSanbox.set(projectId,{
//           sandboxId:info.sandboxId,
//           sandboxInitTime: Date.now() 
//         })

//         console.log("created new based on exisiting time time-passed:",`${currentTime - startTime}`,info.sandboxId);
//         return info.sandboxId;
//       }
      
//       return id;
// }

// const sandboxId = await getSandboxId("projectId")
// console.log("retrived data",sandboxId)

wss.on("connection", (ws, req) => {
  const params = new URLSearchParams(req.url.replace("/?", ""));
  const userId = params.get("userId");
  console.log("New WebSocket:", userId);
  console.log("client list active id",clients.keys())

  if (userId) clients.set(userId, ws);
  const mapIter = clients.keys();
  console.log("iterate",mapIter.next().value)
  ws.on("close", () => {
    clients.delete(userId);
    console.log("client disconnected")
  });
});

server.listen(8080,()=>{
  console.log("server started to listen")
});
