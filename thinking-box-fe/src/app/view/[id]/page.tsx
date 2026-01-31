"use client";
import React, { useEffect, useRef, useState } from 'react'
import {  Codesandbox, Command, Copy, SquareArrowOutUpRight } from 'lucide-react';
import { Code,Globe} from "lucide-react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,

} from "@/components/ui/tabs"
import handleRequest from '@/utils/request';
import dynamic from 'next/dynamic';

import {buildFileTree, FileNode, FileTree} from '@/components/fileTree';
import { CodeEditor } from '@/components/codeEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DotLottiePlayer } from '@dotlottie/react-player';

import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { Monitor, Tablet, Smartphone } from 'lucide-react';

export enum From {
  USER,
  ASSISTANT
}



export interface MessagePacket {
  content: string,
  from: From,
}

function ViewProject({params}) {
  const {id} = React.use(params)
  const loaded = useRef(false);

   
  
  const [projectUri, setProjectUri] = useState("")
  const [linkArrived,setLinkArrived] = useState(!!sessionStorage.getItem(`project_URL_${id}`))
  const [thinking, setThinking] = useState(false)
  const [building, setBuiding] = useState(false)
const [fileTree, setFileTree] = useState<FileNode[]>([]);
const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
const [isFileTreeLoading, setIsFileTreeLoading] = useState(false);
const [projectTitle, setProjectTitle] = useState("New Project");
  const { data: session } = useSession();
  const userId = session?.user.id;
  const [responsiveMode, setResponsiveMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const getIframeWidth = () => {
    switch(responsiveMode) {
      case 'mobile':
        return '375px'; // iPhone width
      case 'tablet':
        return '768px'; // iPad width
      case 'desktop':
      default:
        return '100%';
    }
  };
 

  useEffect(()=>{
    if (loaded.current) return ;
    loaded.current = true;
   
    const fetchData = async ()=>{
  
        setIsFileTreeLoading(true);
    const treeData = sessionStorage.getItem(`project_tree_${id}`)
    const projectURL = sessionStorage.getItem(`project_URL_${id}`)

    // RENDER-CONDITION: on next-time when user came back aftersometimes but within 30min or on same session
    if (treeData && projectURL){
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
      const existingData = await handleRequest("GET",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/showcase/history/${id}`)
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
       const existingData = await handleRequest("GET",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/showcase/history/${id}`)
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
      setProjectTitle(title);
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
        <div className="chatWrapper  flex h-[calc(100vh-60px)] gap-2 p-5 ">
            <div className="previewSection  flex-[100%]  border-2 rounded-2xl  border-[#2d2d2d]  h-full  flex-col ">

        <Tabs defaultValue="preview" className='h-full'>

                <div className="navPreview h-15  p-2 flex items-center gap-10  justify-between">
         <TabsList className=''>
          <TabsTrigger value="editor">
            <Code/>
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Globe/>
          </TabsTrigger>
        </TabsList>

        {/* Responsive Mode Toggle - Center */}
        <div className='flex items-center gap-2 bg-[#252525] rounded-lg p-1'>
          <button
            onClick={() => setResponsiveMode('mobile')}
            className={`p-2 rounded-md transition-colors ${
              responsiveMode === 'mobile'
                ? 'bg-[#0070F3] text-white'
                : 'text-[#949494] hover:text-white'
            }`}
            title="Mobile View (375px)"
            aria-label="Mobile responsive mode"
          >
            <Smartphone width={16} height={16} />
          </button>
          <button
            onClick={() => setResponsiveMode('tablet')}
            className={`p-2 rounded-md transition-colors ${
              responsiveMode === 'tablet'
                ? 'bg-[#0070F3] text-white'
                : 'text-[#949494] hover:text-white'
            }`}
            title="Tablet View (768px)"
            aria-label="Tablet responsive mode"
          >
            <Tablet width={16} height={16} />
          </button>
          <button
            onClick={() => setResponsiveMode('desktop')}
            className={`p-2 rounded-md transition-colors ${
              responsiveMode === 'desktop'
                ? 'bg-[#0070F3] text-white'
                : 'text-[#949494] hover:text-white'
            }`}
            title="Desktop View (100%)"
            aria-label="Desktop responsive mode"
          >
            <Monitor width={16} height={16} />
          </button>
        </div>

        {/* Copy and External Links - Right */}
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
        <div className="iFrame flex flex-1 flex-col">
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
      <CodeEditor file={selectedFile} />
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div className='h-full flex justify-center items-center bg-[#1F1F1F] rounded-b-2xl overflow-auto'>
              {
                linkArrived ? (
                  <div className='flex justify-center items-center w-full h-full'>
                    <div
                      className='bg-white  overflow-hidden shadow-xl'
                      style={{
                        width: getIframeWidth(),
                        height: responsiveMode === 'desktop' ? '100%' : 'auto',
                        transition: 'width 0.3s ease-in-out'
                      }}
                    >
                      <iframe
                        src={`${projectUri}`}
                        frameBorder="0"
                        width="100%"
                        height={responsiveMode === 'desktop' ? '100%' : '812px'}
                        style={{ display: 'block' }}
                      />
                    </div>
                  </div>
                ) : (
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
                )
              }
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
export default dynamic(() => Promise.resolve(ViewProject), { ssr: false });