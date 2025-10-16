"use client";
import React, { useEffect, useState } from 'react'
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

function page() {
  
  const [response, setResponse] = useState("")

  useEffect(()=>{
    const options = {
      body :{
        prompt:"create a simple todo app nothing fancy"
      }
    }
    const fetchData = async ()=>{
      const res = await handleRequest("POST","http://localhost:8080/prompt",options)    
      setResponse(res.url);
      console.log("ai resp",res.url)

    }
    fetchData();
  },[])

  return (
    <div className='p-2'>
        <div className="navbar h-10 p-2 flex gap-2  ">
    <Codesandbox className='w-6 h-6'/>
    / Project-01
        </div>
        <div className="chatWrapper  flex h-screen gap-2  ">
            <div className="chatSection flex  flex-[35%] flex-col justify-end">
                <div>
                    <AIInput type="secondary"/>
                </div>
            </div>
            <div className="previewSection flex-[65%] border-1 border-[#2d2d2d] rounded-sm ">

        <Tabs defaultValue="account">

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
                <div className="iFrame">
        <TabsContent value="account" >
          <Card className='h-screen'>
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
          </Card>
        </TabsContent>
        <TabsContent value="password">
          <Card className='h-screen'>
         {/* {
            response.length > 0  ?
            (<iframe src={`https://${response}`} frameborder="0" width="100%" height="500px"></iframe>) : (
              <div>
                Loading...
              </div>
            )
          } */}

            <iframe src={`https://${response}`}  width="100%" height="100%"></iframe>
          </Card>
        </TabsContent>
                </div>
      </Tabs>
            </div>
        </div>
    </div>
  )
}

export default page