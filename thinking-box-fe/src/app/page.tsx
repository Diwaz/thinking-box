import { AIInput } from "@/components/ai-input"
import { Codesandbox } from 'lucide-react';
import {DitherShader} from "@/components/ui/dither-shader";
import { PointerHighlight } from "@/components/ui/pointer-highlight";
import { AppSidebar } from "@/components/app-sidebar"

import {
  SidebarProvider,
} from "@/components/ui/sidebar"


export default function Home() {

  return (
<div className="h-screen overflow-hidden">
   <DitherShader
          src="https://images.unsplash.com/photo-1614728263952-84ea256f9679?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          gridSize={1}
          ditherMode="bayer"
          colorMode="original"
          invert={false}
          animated={false}
          animationSpeed={0.02}
          primaryColor="#000000"
          secondaryColor="#f5f5f5"
          threshold={0.5}
          className="h-full w-[500px] sm:h-screen sm:w-full"
          >



      </DitherShader>
    <SidebarProvider>
      <AppSidebar  />
       
      <section className="absolute  top-0 h-full  w-full   mx-auto flex  flex-col  justify-center items-center  text-center md:pt-44">

    <div className=" flex flex-col p-5 w-[70%] gap-8 items-center ">

        <div className="text-balance  font-sans text-4xl font-extrabold tracking-tight text-black/60 md:text-6xl">
<PointerHighlight
            rectangleClassName="bg-blue-100 dark:bg-[#EB9D2A]/80 border-blue-300 dark:border-[#9F690E] p-2 leading-loose "
            pointerClassName="text-black-500 h-5 w-5"
            containerClassName="inline-block mx-1"
            >
            <span className="relative z-10 "> Ready to Build? </span>
          </PointerHighlight>
        </div>

        <AIInput type="initial"  />
              </div>
      </section>

    </SidebarProvider>

        </div>
  )
}

