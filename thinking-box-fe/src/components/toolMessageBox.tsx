import Image from 'next/image'
import React from 'react'





  const getExtension = (fileName:string): string=>{
    // console.log("filename received in getExtension",fileName)
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

export const ToolMessageBox = ({file}:{file:string}) => {

      const fileType = getExtension(file);
     return (
        <div  className=' p-2 flex flex-col gap-2 m-2  w-40 bg-[#121212] hover:border-[#0070F3] border-1 rounded-sm cursor-pointer text-sm font-bold  '>
          <div>Created:</div>
          
      <div className='flex items-center  gap-2 text-sm font-light'>
        <Image src={`/${fileType}.png`} width={20} height={5} alt={`${fileType}`}/>
        <span className='text-[#959595]'>src/</span>
        {file}
      </div>
        </div>
      )
}
