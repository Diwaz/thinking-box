import { Code, Copy, Globe, SquareArrowOutUpRight } from 'lucide-react'
import React from 'react'
import { Skeleton } from './ui/skeleton'
import { FileNode, FileTree } from './fileTree'
import { CodeEditor } from './codeEditor'
import { Card, CardContent, CardHeader } from './ui/card'
import { DotLottiePlayer } from '@dotlottie/react-player'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'


type InputProps = {
  isFileTreeLoading: boolean,
  projectUri?: string,
  fileTree:FileNode[],
  selectedFile: FileNode | null,
  linkArrived:boolean,
  thinking:boolean,
  building:boolean,
  setSelectedFile: (file: FileNode) => void
  setFileTree?: React.Dispatch<React.SetStateAction<FileNode[]>>,
  IsGenerationloading?:boolean,
}

export const PreviewWrapper = ({projectUri,isFileTreeLoading,fileTree,setSelectedFile,selectedFile,linkArrived,thinking,building}:InputProps) => {
  return (

        <Tabs defaultValue="preview" className='h-full gap-0'>

                <div className="navPreview  border-1 lg:border-b-1 lg:border-0  p-1 flex items-center gap-10 justify-between">
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
              <div className=' h-full flex justify-center items-center p-4'>
                      <Card className="w-full max-w-xl ">
      <CardHeader>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent >

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
  )

}
