import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import React from 'react'
import AiMsgBox from './aiMessageBox';
import { From, MessagePacket } from '@/app/project/[id]/page';
import { ToolMessageBox } from './toolMessageBox';

type InputProps = {
  messages: MessagePacket[],
}



export const ChatWrapper = ({messages}:InputProps) => {


  return (
    
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
            <div className='bg-[#05001E]  flex justify-end p-4 rounded-lg rounded-tr-none'>

          {item.content}
            </div>
          </div>
        ) : item.from == From.TOOL ? (
<ToolMessageBox file={item.content}/>
        ): (
          <div key={i}>
            {/* {item.content} */}
           <AiMsgBox message={item}/> 
          </div>
        )
      }
      </> 
  ))
}

          {/* <div className='loader'></div> */}
                     
                    </div>
                    ):(
                      <div>Empty</div>
                    )}

                
                 
                    </div> 

  )
}
