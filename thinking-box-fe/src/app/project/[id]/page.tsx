"use client";
import React, { useEffect, useRef, useState } from 'react'
import { Codesandbox } from 'lucide-react';
import { Code,Globe,ChevronLeft,ChevronRight,LaptopMinimalCheck,ScreenShare,RotateCcw,Download,Ellipsis} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,

} from "@/components/ui/tabs"
import { AIInput } from '@/components/ai-input';
import handleRequest from '@/utils/request';
import dynamic from 'next/dynamic';
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'



function WebBuilder({params}) {
  const {id} = React.use(params)
  // const loaded = useRef(false);
  console.log("projecID",id)

   
  
  const [response, setResponse] = useState("")
  const [initialPrompt, setInitialPrompt] = useState("")
  const [messages, setMessages] = useState([])
  
  useEffect(()=>{
    // if (loaded.current) return ;
    const ws = new WebSocket(`ws://localhost:8080/?userId=a770b0b5-2bdc-49e3-9795-f887703803fa`)
    
    ws.onmessage = (e) => {
      console.log("user connected")
      const data = JSON.parse(e.data);
      console.log("msg from socket",data.message)
      setMessages(prev => [...prev,data.message]);
      
    }
    
    const fetchData = async ()=>{
      const projectData = await handleRequest("GET",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/project/${id}`)
      
      console.log("initial prompt from server",projectData.conversationHistory)
      if (projectData.conversationHistory.length === 0 ){
        setInitialPrompt(projectData.initialPrompt);
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

      }

      // if(projectData.conversationHistory.length > 0){

      // setMessages(res.messages);
      // }
      
    }
    fetchData();

    return () => ws.close();
  },[])

  return (
    <div className='px-1'>
        <div className="navbar h-10  flex gap-2 p-2  ">
    <Codesandbox className='w-6 h-6'/>
    / Landing-Page
        </div>
        <div className="chatWrapper  flex h-[calc(100vh-40px)] gap-2  ">
            <div className="chatSection flex  flex-[35%]  items-center flex-col justify-end ">
                  <div className='ConversationWrapper flex  flex-col gap-2  p-5 h-full w-full overflow-y-scroll overflow-x-hidden pb-10 '>
                    {/* <div className="HumanMsg flex flex-row-reverse ">
                      <div className="humanChatWrapper bg-[#1f1f1f] p-4 rounded-lg w-[80%]">
                        
                      <div className=''>
                                {initialPrompt}
                      </div>
                      </div>
                    </div> */}
                    {messages.length > 0 ? (
                    <div className="aiMsg  ">
                    {/* <div className="aiMsg  p-4 w-[80%]"> */}
                     {
  messages.map((item, i) => {
    const content = item;

    const isAI = item;
    // console.log("checking",checking)
    return Array.isArray(content) ? (
      <div key={i}>
        {content.map((subItem, idx) => (
          // <div key={idx}>
          //   Ai msg for tool calls
          // </div>
          // <div key={`${i}-${idx}`}> {subItem?.text}</div>
          
           <Markdown remarkPlugins={[remarkGfm]} key={idx}>
              {subItem?.text}
           </Markdown> 
          
        ))}
      </div>
    ) : typeof content === "object" && content !== null ? (
        // here it uses tool calling 
      <div key={i}>
        Using tools {content?.kwargs?.content ?? JSON.stringify(content)}
      </div>
    ) : (
      <div key={i}>
        {Object.hasOwn(isAI,'tool_calls') ? (
          <div>

          </div>
        ):(
          <div>
  <div className="HumanMsg flex flex-row-reverse w-full">
                      <div className="humanChatWrapper bg-[#1f1f1f] p-4 rounded-lg w-[80%]">
                        
                      <div className=''>
                                {content?.text ?? content ?? "No content"}
                      </div>
                      </div>
                    </div>
          </div>
        )}
        {/* {content?.text ?? content ?? "No content"} */}
      </div>
    );
  })
}

                      
                    </div>
                    ):(
                      <div>nothing to see</div>
                    )}

                
                 
                    </div> 
                <div className='w-full shadow-[0_-4px_6px_3px_rgba(0,0,0,0.4)]  '>
                    <AIInput type="secondary" projectId={id} userId={'a770b0b5-2bdc-49e3-9795-f887703803fa'}/>
                </div>
            </div>
            <div className="previewSection flex-[65%] border-1 border-[#2d2d2d] rounded-sm h-full  flex-col ">

        <Tabs defaultValue="account" className='h-full'>

                <div className="navPreview h-15 border-b-1 p-2 flex items-center gap-10">
         <TabsList>
          <TabsTrigger value="account">
            <Code/>
          </TabsTrigger>
          <TabsTrigger value="password">
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
        <TabsContent value="account" >
          <div className='h-full '>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Make changes to your account here. Click save when you&apos;re
                done.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="tabs-demo-name">Name</Label>
                <Input id="tabs-demo-name" defaultValue="Pedro Duarte" />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="tabs-demo-username">Username</Label>
                <Input id="tabs-demo-username" defaultValue="@peduarte" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save changes</Button>
            </CardFooter>
          </div>
        </TabsContent>
        <TabsContent value="password">
          <div className='h-full'>
         {
            response.length > 0  ?
                        (<iframe src={`${response}`} frameborder="0" width="100%" height="100%"></iframe>) : (
              <div>
                Loading...
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