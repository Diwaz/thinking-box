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


const app = express();

const server = createServer(app);
const wss = new WebSocketServer({server})

app.use(express.json());
app.use(cors());


interface ProjectStore {
  messages:[],
  llmCalls:number
}

const SANDBOX_TIMEOUT = 60_000;

const prisma = new PrismaClient();

const MessageState = z.object({
  messages: z.array(z.custom<BaseMessage>()).register(registry, MessagesZodMeta),
  llmCalls: z.number().optional()
})


type State = z.infer<typeof MessageState>;
type UserStore = Record<string,State>
type GlobalStore = Record<string,UserStore>

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
const baseProjectParser = z.object({
  userId: z.uuid(),
  projectId: z.uuid(),
})

const createProjectParser = baseProjectParser.extend({

  initialPrompt: z.string().min(1,{message:"String must be at least 5 character long"});
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
const state:State ={
  messages:[],
  llmCalls:0,
}
app.post("/prompt",async (req,res)=>{
  const {prompt,projectId,userId} = req.body;

  if (!projectId || !prompt || !userId){
    return res.status(400).json({
      "msg":"invalid input"
    })
  }

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
    const sdx = await Sandbox.connect(sandboxId);


  projectState.messages.push(new HumanMessage(prompt))
  runAgenticManager(userId,projectId,projectState,clients)
  // const result = await agent.invoke(projectState)


  res.status(200).json({
  //  url:host,
    // messages:result.messages,
    status:"processing"
  })

})
const clients = new Map();

// type activeUser = Record<string,SandboxStore>
interface SandboxStore{
  sandboxId: string
  sandboxInitTime: number
}
// interface activeUser {
//   userId:SandboxStore
// }
type activeSandboxes = Record<string,SandboxStore>
const activeSandbox:activeSandboxes[] = [
  
  {'projectId': {
    'sandboxId':'x0x0x0x',
    'sandboxInitTime':1768278262013 
  }},
  // {'projectId2': {
  //   'sandboxId':'x0x0x0x',
  //   'sandboxInitTime':1700023123123
  // }},
  // {'projectId3': {
  //   'sandboxId':'x0x0x0x',
  //   'sandboxInitTime':1700023123123
  // }}
]
// string[] = ['asdas','asdas']
// activeUser[] = [activeUser,activeUser]
// setInterval(() => {

//   for (const sandbox of activeSandbox){
//       // console.log("sandbox in objet",Object.keys(sandbox)[0])
//       const projectId = Object.keys(sandbox)[0];
//       const sandboxData:SandboxStore= Object.values(sandbox)[0]!;
//       const startTime = sandboxData["sandboxInitTime"]
//       const id = sandboxData["sandboxId"];
//       console.log("timer",Date.now())
//       const currentTime = Date.now()
//       const index = activeSandbox.findIndex((item)=> Object.keys(item)[0] === projectId);
//       console.log("yo this the locs",index)
//       if (currentTime - startTime > 300000){
//         activeSandbox.splice(index,1);
//         console.log("removed")
//       }
//   }


// }, 5000 );

const getSandboxId = async (projectId: string) : Promise<string | undefined> => {
  const index = activeSandbox.findIndex((item)=> Object.keys(item)[0] === projectId);
      if (index < 0){
         const sdx = await Sandbox.create({
          timeoutMs: 60_000,
          // timeoutMs:1800_000,
        })
        const info = await sdx.getInfo()
        console.log("created sandbox",info.sandboxId);
        return info.sandboxId;       
      }
      const retrivedSandbox:activeSandboxes = activeSandbox[index]!;
      const startTime = Number(Object.values(retrivedSandbox!)[0]?.sandboxInitTime);
      const id = Object.values(retrivedSandbox!)[0]?.sandboxId
      console.log("here from obj.keys",Object.values(retrivedSandbox)[0]?.sandboxId)
      // console.log("sandbox in objet",Object.keys(sandbox)[0])
      
      console.log("timer",Date.now())
      const currentTime = Date.now()
      console.log("yo this the locs",index)
      if (currentTime - startTime > 1800_000){
        activeSandbox.splice(index,1);
        const sdx = await Sandbox.create({
          timeoutMs: SANDBOX_TIMEOUT,
          // timeoutMs:1800_000,
        })
        const info = await sdx.getInfo()
        console.log("created sandbox",info.sandboxId);
        return info.sandboxId;
        // create new sandbox
        // console.log("removed")
      }
      return id;
}

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
