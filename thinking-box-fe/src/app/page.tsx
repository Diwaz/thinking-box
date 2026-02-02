"use client";
import { AIInput } from "@/components/ai-input"
import { Codesandbox } from 'lucide-react';
import {DitherShader} from "@/components/ui/dither-shader";
import { PointerHighlight } from "@/components/ui/pointer-highlight";
import { AppSidebar } from "@/components/app-sidebar"

import {
  SidebarProvider,
  SidebarTriggerCustom,
} from "@/components/ui/sidebar"
import React from "react";
import { ShowcaseProjects } from "@/components/showcase-projects";

export default function Home() {


  return (
    <>
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
          className="h-full w-[600px] sm:h-screen sm:w-full"
          >



      </DitherShader>
    <SidebarProvider defaultOpen={true}>
      <AppSidebar  />
      <section className="absolute  top-0 h-full  w-full   mx-auto flex  flex-col  justify-center items-center  text-center md:pt-44">
        <div className=" absolute flex items-center  justify-between  w-full top-0 left-0  sm:hidden">

    <SidebarTriggerCustom />
    <div className="flex items-center gap-2 flex-row-reverse px-1">
  <div className="bg-[#05001E] text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Codesandbox className="size-4" />
          </div>
<div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{"Thinking-box"}</span>
            {/* <span className="truncate text-xs">{"Think Build Ship"}</span> */}
          </div>
    </div>
    
        </div>

    <div className=" flex flex-col p-5 w-full sm:w-[70%] gap-8 items-center ">

        <div className="text-balance  font-sans text-4xl font-extrabold tracking-tight text-black/60 md:text-6xl">
        <span className="relative  ">THINK   </span>
<PointerHighlight
            rectangleClassName="bg-blue-100 dark:bg-[#05001E]/80  dark:border-[#05001E] p-2 leading-loose "
            pointerClassName="text-black-500 h-5 w-5"
            containerClassName="inline-block mx-1"
            >

            <span className="relative z-10 text-white ">BUILD  </span>
          </PointerHighlight>
            <span className="relative z-10 "> SHIP </span>
        </div>

        <AIInput 
              type="initial"
              />

              </div>
      </section>

    </SidebarProvider>

        </div>
              <section className="bg-[#05171C] w-full flex justify-center ">

              <div className="bg-[#05001E] rounded-lg p-5  backdrop-blur-xl  w-[95%] relative top-[-100px] ">
              <ShowcaseProjects/> 
              </div>
              </section>
              </>
  )
}

