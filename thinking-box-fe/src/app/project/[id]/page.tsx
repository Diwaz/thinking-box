"use client";
import React, { useEffect, useRef, useState } from 'react'
import { Codesandbox } from 'lucide-react';
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

enum From {
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

   
  
  const [response, setResponse] = useState("")
  const [initialPrompt, setInitialPrompt] = useState("")
  const [messages, setMessages] = useState<MessagePacket[]>([])
  const [thinking, setThinking] = useState(false)
  const [building, setBuilding] = useState(false)
  const [validating, setValidating] = useState(false)
const [fileTree, setFileTree] = useState<FileNode[]>([]);
const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
const [isFileTreeLoading, setIsFileTreeLoading] = useState(false);
 


  // useEffect(()=>{
  //   const treeData = sessionStorage.getItem(`project_tree_${id}`)

  //   if (treeData){
  //     console.log("length of tree ",JSON.parse(treeData))
  //     setFileTree(JSON.parse(treeData));
  //   }
  // },[])

  useEffect(()=>{
    if (loaded.current) return ;
    loaded.current = true;
    const ws = new WebSocket(`ws://localhost:8080/?userId=a770b0b5-2bdc-49e3-9795-f887703803fa`)
    
    ws.onmessage = (e) => {
      console.log("user connected")
      const data = JSON.parse(e.data);
      console.log("msg from socket",data.message.message)
      switch(data.message.action){
        case "LLM_UPDATE":
          setMessages(prev => [...prev,
            {
              content: data.message.message,
              from: From.ASSISTANT
            }
          ]); 
        case "Thinking":
          setThinking(true)
        case "Building":
          setBuilding(true)
        case "BUCKET_UPDATE":
          // setValidating(true)
          // console.log("msg we receive from socket",data.message)

          const tree = buildFileTree(data.message.files)  
          sessionStorage.setItem(`project_tree_${id}`,JSON.stringify(tree))
          setIsFileTreeLoading(false);
          setFileTree(tree || [])
      }

      
    }
    
    const fetchData = async ()=>{
      const projectData = await handleRequest("GET",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/project/${id}`)

      console.log("initial prompt from server",projectData.conversationHistory)


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
          setResponse(res.uri);

      }else{
        const messageHistory = projectData.conversationHistory; 
        messageHistory.forEach((msg)=>{
          setMessages((prev)=>[...prev,{
            content:msg.contents,
            from: msg.messageFrom === "USER" ? From.USER : From.ASSISTANT
          }])
        })

        setIsFileTreeLoading(true);
    const treeData = sessionStorage.getItem(`project_tree_${id}`)
    const projectURL = sessionStorage.getItem(`project_URL_${id}`)
    if (treeData && projectURL){
      // console.log("we here on sessionStorage",JSON.parse(treeData))
      // console.log("response uri",response)
      setFileTree(JSON.parse(treeData)); 
      setResponse(projectURL);      

        setIsFileTreeLoading(false);
    }else {

        setIsFileTreeLoading(true);
      const existingData = await handleRequest("GET",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/project/history/${id}`)
      const filesData = existingData.fileContent
      const tree = buildFileTree(filesData)  
      sessionStorage.setItem(`project_tree_${id}`,JSON.stringify(tree))
      sessionStorage.setItem(`project_URL_${id}`,existingData.uri);
      setFileTree(tree || []); 

      setIsFileTreeLoading(false);
      // console.log("existing data",existingData)
      setResponse(existingData.uri)
    }
    // const conversation = existingData.conversation
      }
      
     
    }
    setIsFileTreeLoading(false);
    fetchData();

    // return () => ws.close();
  },[])

  useEffect(()=>{
    const fetchUpdate =async ()=>{
    //  console.log("check state here",fileTree) 
    console.log("one last time")
    const treeData = sessionStorage.getItem(`project_tree_${id}`)

    // const hostedURL = sessionStorage.getItem(`project_URL_${id}`);
    // console.log("fetching here",treeData)
    if (!treeData){
      console.log("we go fetching again")
       const existingData = await handleRequest("GET",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/project/history/${id}`)
      const filesData = existingData.fileContent
      const tree = buildFileTree(filesData)  
      console.log("URL",existingData.uri)
      sessionStorage.setItem(`project_tree_${id}`,JSON.stringify(tree))
      sessionStorage.setItem(`project_URL_${id}`,existingData.uri);
      setFileTree(tree || []); 

      // console.log("existing data",existingData)
      setResponse(existingData.uri)
    }

    }
    fetchUpdate();

  },[fileTree,id])

  return (
    <div className='px-1'>
        <div className="navbar h-10  flex gap-2 p-2  ">
    <Codesandbox className='w-6 h-6'/>
    / Landing-Page
        </div>
        <div className="chatWrapper  flex h-[calc(100vh-40px)] gap-2  ">
            <div className="chatSection flex  flex-[35%]  items-center flex-col justify-end ">
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
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
            <div className='bg-[#1F1F1F]  w-[80%] lg:w-[40%] flex justify-end p-4 rounded-sm'>

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

                      
                    </div>
                    ):(
                      <div>Empty</div>
                    )}

                
                 
                    </div> 
                <div className='w-full shadow-[0_-4px_6px_3px_rgba(0,0,0,0.4)]  '>
                    <AIInput type="secondary" projectId={id} userId={'a770b0b5-2bdc-49e3-9795-f887703803fa'} changeFileState={setFileTree}/>
                </div>
            </div>
            <div className="previewSection flex-[65%] border-1 border-[#2d2d2d] rounded-sm h-full  flex-col ">

        <Tabs defaultValue="editor" className='h-full'>

                <div className="navPreview h-15 border-b-1 p-2 flex items-center gap-10">
         <TabsList>
          <TabsTrigger value="editor">
            <Code/>
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Globe/>
          </TabsTrigger>
        </TabsList>
                   <div className='flex  border-2 border-[#2d2d2d] justify-between bg-[#1a1a1a]  items-center px-2 rounded-sm w-full h-7'>
                    <div className="sec1 flex items-center  gap-1 ">

                   <div>
            <ChevronLeft className='w-3 h-3 '/>
                    </div> 
                   <div>
                    <ChevronRight className='w-3 h-3'/> 
                    </div> 
                   <div>
                    <LaptopMinimalCheck className='w-3 h-3'/>
                    </div> 
                   <div className='text-[10px] ml-0.5 lg:text-sm'>/ localhost:3000</div> 
                    </div>
                    <div className="sec2 flex items-center  gap-1">

                   <div>
                    <ScreenShare className='w-3 h-3'/> 
                    </div> 
                   <div>
                    <RotateCcw className='w-3 h-3'/>
                    </div> 
                    </div>
                   </div>
                   <div className='flex gap-5'>
                    <div>
                        <Download className='w-5 h-5'/>
                    </div>
                    <div>
                        <Ellipsis className='w-5 h-5'/>
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
            response.length > 0  ?
                        (<iframe src={`${response}`} frameBorder="0" width="100%" height="100%"></iframe>) : (
              <div className=' h-full flex justify-center items-center'>
                      <Card className="w-full max-w-xl ">
      <CardHeader>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="aspect-video w-full" />
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
        </div>
    </div>
  )
}

// export default WebBuilder;
export default dynamic(() => Promise.resolve(WebBuilder), { ssr: false });