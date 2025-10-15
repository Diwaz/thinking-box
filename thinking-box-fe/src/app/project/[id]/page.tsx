import React from 'react'
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

function page() {
  return (
    <div className='p-2'>
        <div className="navbar h-10 p-2 flex gap-2  ">
    <Codesandbox className='w-6 h-6'/>
    / Project-01
        </div>
        <div className="chatWrapper  flex h-screen  ">
            <div className="chatSection flex-[35%] ">chat</div>
            <div className="previewSection flex-[65%] border-1 border-[#2d2d2d] rounded-sm ">

        <Tabs defaultValue="account">

                <div className="navPreview h-12 border-b-1 p-2 flex items-center gap-10">
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
                   <div className='text-sm ml-0.5'>/ localhost:3000</div> 
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
        <TabsContent value="account">
          <Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Change your password here. After saving, you&apos;ll be logged
                out.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="tabs-demo-current">Current password</Label>
                <Input id="tabs-demo-current" type="password" />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="tabs-demo-new">New password</Label>
                <Input id="tabs-demo-new" type="password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save password</Button>
            </CardFooter>
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