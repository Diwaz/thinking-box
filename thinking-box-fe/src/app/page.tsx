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
import SignIn from "@/components/sign-in";
import { PromptSuggestions, type PromptSuggestion } from "@/components/prompt-suggestions";
import { Zap, Code2, Palette } from 'lucide-react';
import React from "react";

const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    id: "1",
    name: "Portfolio Site",
    logo: <Code2 width={16} height={16} className="text-blue-400" />,
    prompt: "Design a visually striking personal portfolio based on a modern bento-grid layout. The grid should feature distinct tiles including a large 'About Me' introduction, a scrolling marquee for skills, and a vertical 'Experience' timeline with expandable details. Include a dedicated 'Projects' gallery where hovering over cards reveals case study summaries, and finish with a minimal contact section."
  },
  {
    id: "2",
    name: "Ecommerce Portal",
    logo: <Palette width={16} height={16} className="text-purple-400" />,
    prompt: "Create a comprehensive e-commerce storefront layout. It should feature an immersive split-screen hero banner, followed by a 'New Arrivals' carousel. Include a robust product filtering sidebar next to a masonry-style product grid. Add a 'Trust & Reviews' section with customer testimonials, a newsletter subscription banner, and a detailed mega-footer with site navigation."
  },
  {
    id: "3",
    name: "Landing Page",
    logo: <Zap width={16} height={16} className="text-amber-400" />,
    prompt: "Build a high-conversion landing page structure. Start with a bold hero section containing a magnetic headline and dual call-to-action buttons. Follow with a 'How it Works' section using zig-zag text and image layouts, a three-tier pricing table with a 'Recommended' highlight, a scrolling logo wall of partners, and an FAQ accordion section at the bottom."
  },
];

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
  )
}

