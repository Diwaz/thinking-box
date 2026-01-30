"use client";
import React, { useEffect, useRef, useState } from 'react'
import { AppWindow, AppWindowMac, BadgeCheck, Braces, Brackets, Codesandbox, Command, Copy, Hash, SquareArrowOutUpRight } from 'lucide-react';
import { Code,Globe,ChevronLeft,ChevronRight,LaptopMinimalCheck,ScreenShare,RotateCcw,Download,Ellipsis} from "lucide-react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,

} from "@/components/ui/tabs"
import { AIInput } from '@/components/ai-input';
import handleRequest from '@/utils/request';
import dynamic from 'next/dynamic';

import {buildFileTree, FileNode, FileTree} from '@/components/fileTree';
import { CodeEditor } from '@/components/codeEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import AiMsgBox from '@/components/aiMessageBox';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { DotLottiePlayer } from '@dotlottie/react-player';
import Image from 'next/image';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
export enum From {
  USER,
  ASSISTANT
}



export interface MessagePacket {
  content: string,
  from: From,
}

function WebBuilder({params}) {
  const {id} = React.use(params)
  const loaded = useRef(false);
  console.log("projecID",id)

   
  
  const [projectUri, setProjectUri] = useState("")
  const [linkArrived,setLinkArrived] = useState(!!sessionStorage.getItem(`project_URL_${id}`))
  const [initialPrompt, setInitialPrompt] = useState("")
  const [messages, setMessages] = useState<MessagePacket[]>([])
  const [thinking, setThinking] = useState(false)
  const [building, setBuiding] = useState(false)
  const [delivering, setDelivering] = useState(true)
const [fileTree, setFileTree] = useState<FileNode[]>([]);
const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
const [isFileTreeLoading, setIsFileTreeLoading] = useState(false);
const [projectTitle, setProjectTitle] = useState("New Project");
const [createdFile,setCreatedFile]= useState<string[]>([]);
 


  // useEffect(()=>{
  //   const treeData = sessionStorage.getItem(`project_tree_${id}`)

  //   if (treeData){
  //     console.log("length of tree ",JSON.parse(treeData))
  //     setFileTree(JSON.parse(treeData));
  //   }
  // },[])
  const getExtension = (fileName:string): string=>{
    console.log("filename received in getExtension",fileName)
    const extension = fileName.split(".").pop()?.toLowerCase();
    if (extension==="jsx" || extension==="tsx" || extension==="js" || extension==="ts"){
      return 'react';
    }else if(extension==="css"){
      return 'css';
    }else if (extension==="html"){
      return "html"
    }
    else{
      return 'rust'
    }

  }
  useEffect(()=>{
    if (loaded.current) return ;
    loaded.current = true;
    const ws = new WebSocket(`ws://localhost:8080/?userId=a770b0b5-2bdc-49e3-9795-f887703803fa`)
    
    ws.onmessage = (e) => {
      console.log("user connected")
      const data = JSON.parse(e.data);
      // console.log("msg from socket",data.message.message)
      switch(data.message.action){
        case "LLM_UPDATE":
          setMessages(prev => [...prev,
            {
              content: data.message.message,
              from: From.ASSISTANT
            }
          ]); 
          break;
        case "FILE_CREATION_UPDATE":
          if (data.message.message){
            console.log("file_creation_update",data.message.message)
            const message = data.message.message.split("/").pop();
            setCreatedFile(prev=> [...prev,message]) 
          }
          break;
        case "THINKING":
          setThinking(true)
          break;
        case "BUILDING":
          setThinking(false)
          setBuiding(true);
          break;
        case "DELIVERING":
          setBuiding(false);
          setDelivering(true);
          break;
        case "TITLE_UPDATE":
          if (data.message.title){
            setProjectTitle(data.message.title)
          }
          break;
        case "BUCKET_UPDATE":
          // setValidating(true)
          // console.log("msg we receive from socket",data.message)
          setDelivering(false);
          setLinkArrived(true);
          sessionStorage.setItem(`project_URL_${id}`,projectUri);
          const tree = buildFileTree(data.message.files)  
          sessionStorage.setItem(`project_tree_${id}`,JSON.stringify(tree))
          setIsFileTreeLoading(false);
          setFileTree(tree || [])
          break;
      }

      
    }
    
    const fetchData = async ()=>{
      const projectData = await handleRequest("GET",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/project/${id}`)

      console.log("initial prompt from server",projectData.conversationHistory)

        //RENDER-CONDITION: On First time screen
      if (projectData.conversationHistory.length === 0 ){
        setInitialPrompt(projectData.initialPrompt);
          setMessages(prev => [...prev,
            {
              content: projectData.initialPrompt,
              from: From.USER
            }
          ]); 
        console.log("hello no conv history")
        const options = {
          body :{
            prompt: projectData.initialPrompt,
            projectId:id,
            userId:'a770b0b5-2bdc-49e3-9795-f887703803fa'
          }
        }
          const res = await handleRequest("POST","http://localhost:8080/prompt",options)    
          console.log("res from pes",res)
          // setResponse(res.uri);
          setProjectUri(res.uri);

        // RENDER-CONDITION: On follow-up prompt 
      }else{
        const messageHistory = projectData.conversationHistory; 
        const title = projectData.title;
        if (title.length > 0){
          setProjectTitle(title)
        }
        messageHistory.forEach((msg)=>{
          setMessages((prev)=>[...prev,{
            content:msg.contents,
            from: msg.messageFrom === "USER" ? From.USER : From.ASSISTANT
          }])
        })

        setIsFileTreeLoading(true);
    const treeData = sessionStorage.getItem(`project_tree_${id}`)
    const projectURL = sessionStorage.getItem(`project_URL_${id}`)

    // RENDER-CONDITION: on next-time when user came back aftersometimes but within 30min or on same session
    if (treeData && projectURL){
      // console.log("we here on sessionStorage",JSON.parse(treeData))
      // console.log("response uri",response)
      console.log("we already have project datas",projectURL)
      setFileTree(JSON.parse(treeData)); 
      // setResponse(projectURL);      
      setProjectUri(projectURL)

        setIsFileTreeLoading(false);
        setLinkArrived(true);

        //RENDER-CONDITION: on next-time when user came back but after 30min on new session
    }else {

        // setIsFileTreeLoading(true);
        console.log("should not reach here on the 1st render")
      const existingData = await handleRequest("GET",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/project/history/${id}`)
      const filesData = existingData.fileContent
      const tree = buildFileTree(filesData)  
      sessionStorage.setItem(`project_tree_${id}`,JSON.stringify(tree))
      sessionStorage.setItem(`project_URL_${id}`,existingData.uri);
      setLinkArrived(true);
      setFileTree(tree || []); 

      setIsFileTreeLoading(false);
      // console.log("existing data",existingData)
      // setResponse(existingData.uri)
    }
    // const conversation = existingData.conversation
      }
      
     
    }
    setIsFileTreeLoading(false);
    fetchData();

    // return () => ws.close();
  },[])


  // RENDER-CONDITION:when user goes for new prompt on existing project or project-Id changes
  useEffect(()=>{
    const fetchUpdate =async ()=>{
    //  console.log("check state here",fileTree) 
    console.log("one last time")
    const treeData = sessionStorage.getItem(`project_tree_${id}`)

    // const hostedURL = sessionStorage.getItem(`project_URL_${id}`);
    // console.log("fetching here",treeData)
    if (!treeData){
      console.log("we go fetching again")
      setLinkArrived(false);
       const existingData = await handleRequest("GET",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/project/history/${id}`)
       const title = existingData.title
       if (title){
      const filesData = existingData.fileContent
      const tree = buildFileTree(filesData)  
      console.log("URL",existingData.uri)
      sessionStorage.setItem(`project_tree_${id}`,JSON.stringify(tree))
      sessionStorage.setItem(`project_URL_${id}`,existingData.uri);
      setFileTree(tree || []); 
      setLinkArrived(true);
      setProjectUri(existingData.uri);
       }

      // console.log("existing data",existingData)
      // setResponse(existingData.uri)
    }

    }
    fetchUpdate();

  },[fileTree,id])

  return (
    <div className='px-1'>
        <div className="navbar items-center  flex gap-5 h-15 bg-[#1F1F1F] p-5 ">
          <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg cursor-pointer'>
            <Link href={'/'}>
    <Codesandbox className='w-4 h-4'/>
            </Link>
          </div>
  <Separator orientation='vertical' /> 
   <div className='  bg-sidebar-primary  h-8 rounded-sm px-5 flex items-center gap-3 '>
    <Command width={15} className=''/>
    {projectTitle}
    </div> 
        </div>
        <div className="chatWrapper  flex h-[calc(100vh-60px)] gap-2  ">
            <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={35} minSize={25} className='flex flex-col justify-en items-center'>

            <div className="chatSection flex  flex-[35%]  items-center flex-col justify-end overflow-x-hidden overflow-y-scroll h-full">
                  <div className='ConversationWrapper flex  flex-col gap-2  p-5 h-full w-full overflow-y-scroll overflow-x-hidden pb-10 '>
                  
                    {messages.length > 0 ? (
                    <div className="aiMsg flex flex-col gap-5  ">
                     {
  messages.map((item, i) => (
     <>
      {
        item.from == From.USER ? (
          <div key={i} className=' flex flex-col w-full items-end gap-2 '>
   <Avatar className='w-7 h-7 relative'>
      <AvatarImage
        src="https://vercel.com/api/www/avatar/eKRgDWQIpnvG1GmMj4z6XZFr"
        alt="@shadcn"
        className='rounded-xl'
      />
      <AvatarFallback>TB</AvatarFallback>
    </Avatar>
            <div className='bg-[#1F1F1F]  flex justify-end p-4 rounded-lg'>

          {item.content}
            </div>
          </div>
        ):(
          <div key={i}>
            {/* {item.content} */}
           <AiMsgBox message={item}/> 
          </div>
        )
      }
      </> 
  ))
}
  {createdFile.length > 0 ? (
    <div>{createdFile.map((file,indx)=>{
      const fileType = getExtension(file);
      return (
        <div key={indx} className=' p-2 flex flex-col gap-2 m-2  w-40 bg-[#121212] hover:border-[#0070F3] border-1 rounded-sm cursor-pointer text-sm font-bold  '>
          <div>Created:</div>
          
      <div className='flex items-center  gap-2 text-sm font-light'>
        <Image src={`/${fileType}.png`} width={20} height={5} alt={`${fileType}`}/>
        <span className='text-[#959595]'>src/</span>
        {file}
      </div>
        </div>
      )
    })}</div>
  ):(
    <div></div>
  )}
          {/* <div className='loader'></div> */}
                     
                    </div>
                    ):(
                      <div>Empty</div>
                    )}

                
                 
                    </div> 
                <div className='w-full shadow-[0_-4px_6px_3px_rgba(0,0,0,0.4)]  '>
                    <AIInput type="secondary" projectId={id} userId={'a770b0b5-2bdc-49e3-9795-f887703803fa'} changeFileState={setFileTree} setMessages={setMessages}/>
                </div>
            </div>

            </ResizablePanel>
                    <ResizableHandle withHandle className='hover:bg-[#64E6FB]'/>
            <ResizablePanel defaultSize={65} minSize={30}>

            <div className="previewSection  flex-[65%]  border-r-1  border-[#2d2d2d]  h-full  flex-col ">

        <Tabs defaultValue="preview" className='h-full'>

                <div className="navPreview h-15 border-b-1 p-2 flex items-center gap-10 justify-between">
         <TabsList className=''>
          <TabsTrigger value="editor">
            <Code/>
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Globe/>
          </TabsTrigger>


        </TabsList>
        {/* <div className='text-sm bg-[#1F1F1F] p-2 rounded-sm px-5'>
          {projectTitle}
        </div> */}
        <div className='flex gap-5 px-2 items-center justify-center'>
          <div className=' px-1 rounded-sm cursor-pointer'>
<Copy width={15} className='text-[#949494] hover:text-white'/>   
          </div>
          <div className=' px-1 rounded-sm cursor-pointer'>
            <a href={`${projectUri}`} target='_blank' rel='noopener noreferrer'>
 <SquareArrowOutUpRight width={15} className='text-[#949494] hover:text-white'/>
            </a>
 </div>
 
        </div>
             
                
        </div>
                <div className="iFrame  flex flex-1 flex-col">
        <TabsContent value="editor" >
          <div className='flex '>
                    <div className='flex flex-col px-2 flex-[0_0_25%]'>
                      {
                        isFileTreeLoading ? (
                      <div className='flex flex-col gap-2'>

                      <div className='flex gap-2'>
                        <Skeleton className='h-3 w-3'/>
                        <div className='flex flex-col gap-2'>
                        <Skeleton className='h-3 w-20'/>
                        <Skeleton className='h-3 w-15'/>
                        <Skeleton className='h-3 w-20'/>

                        </div>

                      </div>
                      <div className='flex gap-2'>
                        <Skeleton className='h-3 w-3'/>
                        <div className='flex flex-col gap-2'>
                        <Skeleton className='h-3 w-20'/>
                        <Skeleton className='h-3 w-20'/>
                        <Skeleton className='h-3 w-15'/>

                        </div>

                      </div>
                      <div className='flex gap-2'>
                        <Skeleton className='h-3 w-3'/>
                        <div className='flex flex-col gap-2'>
                        <Skeleton className='h-3 w-20'/>
                        <Skeleton className='h-3 w-20'/>
                        <Skeleton className='h-3 w-15'/>

                        </div>

                      </div>
                         <div className='flex gap-2'>
                        <Skeleton className='h-3 w-3'/>
                        <div className='flex flex-col gap-2'>
                        <Skeleton className='h-3 w-20'/>
                        <Skeleton className='h-3 w-15'/>
                        <Skeleton className='h-3 w-20'/>

                        </div>

                      </div>
                      </div>) : ( <div>
                        <FileTree nodes={fileTree} onFileClick={(file)=>setSelectedFile(file)}/>
                      </div>)
                      }
                     

                    </div>
      {/* <Editor height="90vh"  className='flex flex-[0_0_100%]  ' defaultLanguage="javascript" theme='vs-dark' defaultValue="// some comment" /> */}
      <CodeEditor file={selectedFile} />
          </div>
        </TabsContent>
        <TabsContent value="preview">
          <div className='h-full'>
         {
            linkArrived  ?
                        (<iframe src={`${projectUri}`} frameBorder="0" width="100%" height="100%"></iframe>) : (
              <div className=' h-full flex justify-center items-center'>
                      <Card className="w-full max-w-xl ">
      <CardHeader>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>

        <div className="bg-[#252525] rounded-sm w-full flex justify-center items-center" >
                                                <DotLottiePlayer
                                                src={`${thinking ? "/plane.lottie" : building ? "/cube.lottie" : "/loading.lottie"}`}
                                                loop
                                                autoplay
                                                style={{ width: '200px', height: '200px' }}
                                                className='lg:w-[400px] lg:h-[400px]'
                                            />
          </div>
      </CardContent>
    </Card>
              </div>
            )
          }

            {/* <iframe src={`https://${response}`}  width="100%" height="100%"></iframe> */}
          </div>
        </TabsContent>
                </div>
      </Tabs>
            </div>
            </ResizablePanel>
            </ResizablePanelGroup>
        </div>
        {/* end of chat wrapper */}

    </div>
  )
}

// export default WebBuilder;
export default dynamic(() => Promise.resolve(WebBuilder), { ssr: false });