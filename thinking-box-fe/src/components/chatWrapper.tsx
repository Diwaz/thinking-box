import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import React from 'react'
import AiMsgBox from './aiMessageBox';
import Image from 'next/image';
import { AIInput } from './ai-input';
import { From, MessagePacket } from '@/app/project/[id]/page';
import { FileNode } from './fileTree';

type InputProps = {
  messages: MessagePacket[],
  projectId?: string,
  createdFile?:string[],
  setFileTree?: React.Dispatch<React.SetStateAction<FileNode[]>>,
  setMessages?: React.Dispatch<React.SetStateAction<MessagePacket[]>>;
  IsGenerationloading?:boolean,
}



export const ChatWrapper = ({messages,createdFile,projectId,setFileTree,setMessages,IsGenerationloading}:InputProps) => {

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
  return (
    
            <div className="chatSection flex  flex-[35%]  items-center flex-col justify-end overflow-x-hidden overflow-y-scroll h-full ">
                  <div className='ConversationWrapper flex  flex-col gap-2  p-5 h-full w-full overflow-y-scroll overflow-x-hidden pb-10   '>
                  
                    {messages.length > 0 ? (
                    <div className="aiMsg flex flex-col gap-5   ">
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
  {createdFile && createdFile.length > 0 ? (
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
                    <AIInput type="secondary" projectId={projectId}  changeFileState={setFileTree} setMessages={setMessages} loadingState={IsGenerationloading} />
                </div>
            </div>
  )
}
