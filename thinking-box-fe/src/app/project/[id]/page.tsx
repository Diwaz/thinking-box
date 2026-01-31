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
const [IsGenerationloading,setIsGenerationLoading] = useState(true);
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
          setIsGenerationLoading(false);
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
          }
        }
          const res = await handleRequest("POST","http://localhost:8080/prompt",options)    
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
            <ResizablePanel defaultSize={35} minSize={25} className='flex flex-col justify-end w-full'>
     <ChatWrapper messages={messages} createdFile={createdFile} projectId={id} setFileTree={setFileTree} setMessages={setMessages} IsGenerationloading={IsGenerationloading} /> 
            </ResizablePanel>
                    <ResizableHandle withHandle className='hover:bg-[#64E6FB]'/>
            <ResizablePanel defaultSize={65} minSize={30}>

<PreviewWrapper projectUri={projectUri} isFileTreeLoading={isFileTreeLoading} fileTree={fileTree} setSelectedFile={setSelectedFile} selectedFile={selectedFile} linkArrived={linkArrived} thinking={thinking} building={building}  />
            {/* End of preview section */}
            </ResizablePanel>
            </ResizablePanelGroup>
        </div>
        {/* end of chat wrapper */}

    </div>
  )
}

// export default WebBuilder;
export default dynamic(() => Promise.resolve(WebBuilder), { ssr: false });