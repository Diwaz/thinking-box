"use client";
import React, { useEffect, useRef, useState } from 'react'
import {  Codesandbox, Command } from 'lucide-react';

import handleRequest from '@/utils/request';
import dynamic from 'next/dynamic';

import {buildFileTree, FileNode} from '@/components/fileTree';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { ChatWrapper } from '@/components/chatWrapper';
import { PreviewWrapper } from '@/components/previewPanel';
import { AIInput } from '@/components/ai-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
export enum From {
  USER,
  ASSISTANT,
  TOOL
}




export interface MessagePacket {
  content: string,
  from: From,
}
interface MessageFromDB {
  contents: string,
  messageFrom: "USER" | "ASSISTANT",
}

function WebBuilder({params}:{params:{id:string}}) {
  const {id} = params;
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
const [IsGenerationloading,setIsGenerationLoading] = useState(false);
  const { data: session } = useSession();
  const userId = session?.user.id;


 

  useEffect(()=>{
    if (loaded.current) return ;
    loaded.current = true;
    const ws = new WebSocket(`ws://localhost:8080/?userId=${userId}`)
    
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
            const message = data.message.message.split("/").pop();
            setMessages(prev=>[...prev,{
              content:message,
              from: From.TOOL
            }])
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
          setIsGenerationLoading(false);
          sessionStorage.setItem(`project_URL_${id}`,projectUri);
          const tree = buildFileTree(data.message.files)  
          sessionStorage.setItem(`project_tree_${id}`,JSON.stringify(tree))
          setIsFileTreeLoading(false);
          setFileTree(tree || [])
          break;
        case "INVALID_INPUT":
          setIsGenerationLoading(false);
             setThinking(false); 
            setBuiding(false);
            setDelivering(false);
          break;
      }

      
    }
    
    const fetchData = async ()=>{
      const projectData = await handleRequest("GET",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/project/${id}`)
      console.log("why project not found",projectData)
       if (projectData.error){
          toast(projectData.error)
          return ;
        }
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
          setIsGenerationLoading(true);
          setLinkArrived(false);
        const options = {
          body :{
            prompt: projectData.initialPrompt,
            projectId:id,
          }
        }
          const res = await handleRequest("POST","http://localhost:8080/prompt",options)    
        if (res.error){
          toast(res.error)
          return ;
        }
          console.log("res from pes",res)
          // setResponse(res.uri);
          setProjectUri(res.uri);

        // RENDER-CONDITION: On follow-up prompt 
      }else{
        setIsGenerationLoading(true);
        const messageHistory = projectData.conversationHistory; 
        const title = projectData.title;
        if (title.length > 0){
          setProjectTitle(title)
        }
        messageHistory.forEach((msg:MessageFromDB)=>{
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
      setIsGenerationLoading(false);
      console.log("we already have project datas",projectURL)
      setFileTree(JSON.parse(treeData)); 
      // setResponse(projectURL);      
      setProjectUri(projectURL)

        setIsFileTreeLoading(false);
        setLinkArrived(true);

        //RENDER-CONDITION: on next-time when user came back but after 30min on new session
    }else {

        // setIsFileTreeLoading(true);
        setIsGenerationLoading(false);
        console.log("should not reach here on the 1st render")
      const existingData = await handleRequest("GET",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/project/history/${id}`)
       if (existingData.error){
          toast(existingData.error)
          return ;
        }
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
    // //  console.log("check state here",fileTree) 
    // console.log("one last time")
    // const treeData = sessionStorage.getItem(`project_tree_${id}`)

    // // const hostedURL = sessionStorage.getItem(`project_URL_${id}`);
    // // console.log("fetching here",treeData)
    // if (!treeData){
      setLinkArrived(false);
       const existingData = await handleRequest("GET",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/project/history/${id}`)
       if (existingData.error){
          toast(existingData.error)
          return ;
        }
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
    // }

    }
    fetchUpdate();

  },[id])

  return (
<div className=' bg-[#05171C]'>
  <div className="navbar items-center flex gap-5 h-12 border-b-border border-b-1 bg-[#05171C] p-5">
    <div className='bg-[#05001E] text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg cursor-pointer'>
      <Link href={'/'}>
        <Codesandbox className='w-4 h-4'/>
      </Link>
    </div>
    <Separator orientation='vertical'  /> 
    <div  title={`${projectTitle}`} className='bg-[#05001E]  text-xs sm:text-sm h-8 rounded-sm px-5 flex items-center gap-3'>
      <Command width={15} className=''/>
      {projectTitle}
    </div> 
  </div>

  {/* Desktop View */}
  <div className="chatWrapper hidden lg:flex h-[calc(100vh-60px)] gap-2">
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={35} minSize={25} className='flex flex-col justify-end w-full'>
        <div className="chatSection flex bg-[#05171C] flex-[35%] items-center flex-col justify-end overflow-x-hidden overflow-y-scroll h-full scrollbar">
          <ChatWrapper messages={messages}  /> 
          <div className='w-full '>
            <AIInput type="secondary" projectId={id} changeFileState={setFileTree} setMessages={setMessages} loadingState={IsGenerationloading} setLinkArrived={setLinkArrived} setLoadingState={setIsGenerationLoading}/>
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle className='hover:bg-[#64E6FB]'/>
      <ResizablePanel defaultSize={65} minSize={30}>
        <div className="previewSection flex-[65%] bg-[#05171C] border-r-1 border-[#2d2d2d] h-full flex-col">
          <PreviewWrapper projectUri={projectUri} isFileTreeLoading={isFileTreeLoading} fileTree={fileTree} setSelectedFile={setSelectedFile} selectedFile={selectedFile} linkArrived={linkArrived} thinking={thinking} building={building} />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>

  {/* Mobile/Tablet View - Tabs */}
  <div className="lg:hidden h-[calc(100vh-60px)] mt-1">
    <Tabs defaultValue="chat" className="h-full flex flex-col w-full ">
      <TabsList className="w-full grid grid-cols-2 rounded-sm p-0 m-0 border-input border-b-1 bg-[#05171C] h-10 flex-shrink-0">
        <TabsTrigger value="chat" className="rounded-none   data-[state=active]:rounded-sm data-[state=active]:bg-[#05001E] ">
          Chat
        </TabsTrigger>
        <TabsTrigger value="preview" className="rounded-none  data-[state=active]:rounded-sm">
          Preview
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="chat" className="flex-1  m-0 p-0 h-full overflow-hidden">
        <div className="chatSection bg-[#05171C] flex items-center flex-col justify-end overflow-x-hidden overflow-y-scroll h-full scrollbar">
          <ChatWrapper messages={messages}  /> 
          <div className='w-full  flex-shrink-0'>
            <AIInput type="secondary" projectId={id} changeFileState={setFileTree} setMessages={setMessages} loadingState={IsGenerationloading} setLinkArrived={setLinkArrived} setLoadingState={setIsGenerationLoading} />
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="preview" className="flex-1 bg-[#05171C] m-0 p-0 h-full overflow-hidden">
        <div className="previewSection border-r-1 border-[#2d2d2d] h-full flex-col overflow-hidden scrollbar">
          <PreviewWrapper projectUri={projectUri} isFileTreeLoading={isFileTreeLoading} fileTree={fileTree} setSelectedFile={setSelectedFile} selectedFile={selectedFile} linkArrived={linkArrived} thinking={thinking} building={building} />
        </div>
      </TabsContent>
    </Tabs>
  </div>
</div>
  )
}

// export default WebBuilder;
export default dynamic(() => Promise.resolve(WebBuilder), { ssr: false });