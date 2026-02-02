import * as z from "zod";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import { type BaseMessage } from "@langchain/core/messages";
import { HumanMessage } from "@langchain/core/messages";
import { Sandbox } from '@e2b/code-interpreter'
import express, { type Request } from 'express';
import cors from 'cors';
import {  WebSocketServer } from "ws";
import { PrismaClient } from "./generated/prisma";
import { createServer } from "http";
import { runAgenticManager } from "./agenticManager";
import { validateSchema } from "./lib/validate";
import { isObjectExist, loadProjectFromBucket } from "./bucketManager";
import { ConversationType } from "./generated/prisma";
import { MessageFrom } from "./generated/prisma";
import {toNodeHandler} from 'better-auth/node'
import { auth } from "./lib/auth";
import { requireAuth } from "./authMiddleware";
import {createClient} from 'redis';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';



const app = express();

const server = createServer(app);
const wss = new WebSocketServer({server})


const redisClient = createClient();

redisClient.connect().catch(console.error);


const sandboxLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: async (...args: string[]) => {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      return redisClient.sendCommand(args);
    },
  }),
  windowMs: 5 * 60 * 1000, // 30 minute
  max:  Number(process.env.SANDBOX_RATE_LIMIT!), // 10  attempts per  minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    action:"rate-limit",
    error: "Too many attempts from this IP. Please try again later." 
  },
  // Custom key generator (optional)
  keyGenerator: (req) => {
    return req.user?.id || "unknown";
  },
});



const strictLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: async (...args: string[]) => {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      return redisClient.sendCommand(args);
    },
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: Number(process.env.LLM_RATE_LIMIT!), // 2  attempts per  minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    action:"rate-limit",
    error: "Too many  attempts from this IP. Please try again later." 
  },
  // Custom key generator (optional)
  keyGenerator: (req) => {
    return req.user?.id || "unknown";
  },
});




app.use(express.json());
app.use(cors({
  credentials:true,
  origin:"http://localhost:3000"
}));




const SANDBOX_TIMEOUT = 20 * 60 * 1000;

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
  hasEnhancedPrompt: z.boolean().default(false).optional(),
  hasValidPrompt:z.boolean().default(false).optional(), 
  projectTitle: z.string().optional()
})


type State = z.infer<typeof MessageState>;
type ProjectStore = Map<string,State>


// const globalStore:GlobalStore = {}
  const globalStore = new Map<string,ProjectStore>();


// {
//   "user1": {
//     "project1":{
//       messages:[]
//     },
//     "project2":{
//       messages:[]
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
  projectId: z.uuid(),
})
// (property) user: {
//     id: string;
//     createdAt: Date;
//     updatedAt: Date;
//     email: string;
//     emailVerified: boolean;
//     name: string;
//     image?: string | null | undefined | undefined;
// }
const authUserParser = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
})
const createProjectParser = baseProjectParser.extend({

  initialPrompt: z.string().min(1,{message:"String must be at least 5 character long"})
})

const createPromptParser = baseProjectParser.extend({
  
  prompt: z.string().min(1,{message:"String must be at least 5 character long"})
})
app.get('/project/list',requireAuth,async(req,res)=>{
  try {

    const userData = validateSchema(authUserParser)(req.user);
      const {id} = userData; 
  const response = await prisma.project.findMany({
    where:{
      userId:id
    }
  })
  
  // console.log("response",response); 
  return res.status(200).json({
    success: true,
    projects: response 
  })
  
}catch(err){
  return res.status(400).json({
        success: false,
        message: "Invalid Request Schema"
      })
}

})
app.post('/project',requireAuth,async(req,res)=>{
  try{
    const userData = validateSchema(authUserParser)(req.user);
    const userId = userData.id;
    const body = validateSchema(createProjectParser)(req.body);
    const {projectId,initialPrompt}= body;
    const checkLimit = await prisma.project.findMany({
      where:{
        userId
      }
    })
    console.log("check limit log",checkLimit,"checkLim len",checkLimit.length)
    if (checkLimit.length > 20){
      return res.status(409).json({
        success: false,
        message: "Project Limit Exceed!"
      })
    }
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
    return res.status(400).json({
      success:false,
      message: "Invalid Input"
    })
  }

})

app.all('/api/auth/{*any}',toNodeHandler(auth));
app.get("/project/:id",requireAuth,sandboxLimiter,async(req,res)=>{
  const {id} = await req.params;
  try {
    const userData = validateSchema(authUserParser)(req.user);
    const userId = userData.id;
    const projectData = await prisma.project.findFirst({
      where: {
        id,
        userId
      },
      select:{
        id:true,
        title:true,
        initialPrompt:true,
        userId:true,
        conversationHistory:{
          orderBy:{
            createdAt: "asc"
          }
        }
      }
    })

    if (!projectData){
      return res.status(404).json({
        status:false,
        error: "Project Not Found"
      })
    }

    return res.status(200).json(projectData);

  }catch(err){
    console.log("err",err)
    res.status(404).json({
      "not found":err
    })
  }
})

app.get("/showcase/history/:id",requireAuth,sandboxLimiter,async(req,res)=>{
  const {id} = await req.params;
  if (!id){
    return res.status(404).json({
      sucess: false,
      message: "Invalid Request Schema"
    })
  }
  try {

    const userData = validateSchema(authUserParser)(req.user);
    const userId = userData.id;
    
    const projectData = await prisma.showcase.findFirst({
      where: {
        id,
      },
      select:{
        id:true,
        title:true,
        userId:true,
      }
    })
    if (!projectData){
      return res.status(409).json({
        success:false,
        message:"Unauthorized access"
      })
    }
    const title = projectData?.title;

   const sandboxId = await getSandboxId(id);
     if (!sandboxId){
      return res.status(404).json({
        error: "Unable to create Sandbox at the moment"
      })
    }

  
    const sdx = await Sandbox.connect(sandboxId);

    const files = await getFiles(sdx);

        const host = sdx.getHost(5173);
        console.log("sent response to server")
   return res.status(200).json({
      success: true,
      // conversation: projectData,
      fileContent: files,
      uri: `https://${host}`,
      title
    });

  }catch(err){
    console.log("err",err)
    res.status(404).json({
      success: false,
      Error:err
    })
  }
})


app.get("/project/history/:id",requireAuth,sandboxLimiter,async(req,res)=>{
  const {id} = await req.params;
  if (!id){
    return res.status(404).json({
      sucess: false,
      message: "Invalid Request Schema"
    })
  }
  try {

    const userData = validateSchema(authUserParser)(req.user);
    const userId = userData.id;

    const projectData = await prisma.project.findFirst({
      where: {
        id,
        userId
      },
      select:{
        id:true,
        title:true,
        initialPrompt:true,
        userId:true,
        conversationHistory:true
      }
    })
    if (!projectData){
      return res.status(409).json({
        success:false,
        message:"Unauthorized access"
      })
    }
    // if (projectData?.userId !== )
    const title = projectData?.title;

   const sandboxId = await getSandboxId(id);
     if (!sandboxId){
      return res.status(404).json({
        error: "Unable to create Sandbox at the moment"
      })
    }

  
    const sdx = await Sandbox.connect(sandboxId);

    const files = await getFiles(sdx);

        const host = sdx.getHost(5173);
        console.log("sent response to server")
   return res.status(200).json({
      success: true,
      // conversation: projectData,
      fileContent: files,
      uri: `https://${host}`,
      title
    });

  }catch(err){
    console.log("err",err)
    res.status(404).json({
      success: false,
      Error:err
    })
  }
})




app.post("/prompt",requireAuth,strictLimiter,async (req,res)=>{
  try {
    const userData = validateSchema(authUserParser)(req.user);
    const userId = userData.id;
    const body = validateSchema(createPromptParser)(req.body);
    const {prompt,projectId} = body;
    console.log("reached here w/ prompt",prompt)
    // const prompt = await projectData.initialPropmt
    
    const projectExist = await prisma.project.findUnique({
      where:{
        id: projectId,
        userId
      },
      select:{
        id:true,
        title:true,
        userId:true,
        conversationHistory:true
      }
    })

    if (!projectExist){
      return res.status(404).json({
        success: false,
        message:"Project Not Found!"
      })
    }

    if (!globalStore.has(userId)){
      globalStore.set(userId,new Map());
      globalStore.get(userId)?.set(projectId,{
        messages:[],
        llmCalls:0,
        hasSummazied: false,
        generatedFiles:[],
        hasValidated: false,
        errors: [],
        validationAttempt:0,
        hasEnhancedPrompt: false,
        hasValidPrompt:false, 
        projectTitle:"",
      });
    }

    
    const projectState = globalStore.get(userId);
    if (!projectState?.has(projectId)){

      globalStore.get(userId)?.set(projectId,{
        messages:[],
        llmCalls:0,
        hasSummazied: false,
        generatedFiles:[],
        hasValidated: false,
        errors: [],
        validationAttempt:0,
        hasEnhancedPrompt:false,
        hasValidPrompt:false,
        projectTitle:"",
      })
    }else{
      const existingProject = projectState.get(projectId);
      // TODO
      // if (existingProject?.projectTitle?.length === 0){
      //   // db call
      // }
      if (existingProject?.llmCalls! < 1){

      if (projectExist){
          if (projectExist.conversationHistory.length > 3){
            return res.status(409).json({
              success: false,
              message: "LLM limit reached!"
            })
          }
      } else{
        return res.status(404).json({
              success: false,
              message: "Project Not found"
        })
      }
      }
      if (existingProject?.llmCalls! > 3){
               return res.status(409).json({
              success: false,
              message: "LLM limit reached!"
            })
      }

       globalStore.get(userId)?.set(projectId,{
        messages:[],
        llmCalls:existingProject?.llmCalls,
        hasSummazied: false,
        generatedFiles:[],
        hasValidated: false,
        errors: [],
        validationAttempt:0,
        hasValidPrompt:existingProject?.hasEnhancedPrompt,
        hasEnhancedPrompt: existingProject?.hasEnhancedPrompt,
        projectTitle: existingProject?.projectTitle, 
      })  
    }
    const conversationState:State = projectState?.get(projectId)!; 
      console.log("project state",conversationState)
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
    
    conversationState.messages.push(new HumanMessage(prompt))
    runAgenticManager(userId,projectId,conversationState,clients,sdx);
    
    
    res.status(200).json({
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
         await loadProjectFromBucket(sdx,projectId) 
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

wss.on("connection", (ws, req:Request) => {
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
