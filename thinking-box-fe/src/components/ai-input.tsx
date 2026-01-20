"use client"

import { useEffect, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Paperclip, Globe, Lock, Mic, ArrowUp } from "lucide-react"
import { useRouter } from "next/navigation"
import handleRequest from "@/utils/request"

export function AIInput({type,projectId,userId}:{type:string,projectId?:string,userId?:string}) {
  const router = useRouter();
  const [value, setValue] = useState("")
  const [isPublic, setIsPublic] = useState(true)



  const handleSubmit = async(type:string) =>{
    if (type === "initial"){
                 const projectId = crypto.randomUUID();
                const options ={
                  body:{
                    userId:'a770b0b5-2bdc-49e3-9795-f887703803fa',
                    projectId,
                    initialPrompt:value
                  }
                }
                await handleRequest("POST",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/project`,options)
                console.log("uuid",projectId)
                router.push(`/project/${projectId}`)
    }else{
        console.log("handle secondary")
  const options = {
      body :{
        prompt: value,
        projectId,
        userId,
      }
        }
      await handleRequest("POST","http://localhost:8080/prompt",options)    


    }
  }
  return (
    <div className="w-full">
      <div
        className="mx-auto w-full max-w-3xl rounded-3xl  border border-border/50 bg-card/70 p-4 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.05)] backdrop-blur-xl ring-1 ring-ring/10 md:p-5"
        role="group"
        aria-label="AI prompt composer"
      >
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask thinking-box to create a prototype…"
          className="min-h-20 resize-none border-0 bg-transparent px-2 text-base leading-6 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 md:min-h-24 md:text-lg"
          aria-label="Prompt"
        />
          {type === "secondary" ? (

        <div className="mt-3 flex items-center justify-between gap-3">

          {/* Left controls */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full border border-border/50 bg-background/40 hover:bg-background/60"
              aria-label="Add"
            >
              <Plus className="h-4 w-4 text-foreground/80" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-full border border-border/50 bg-background/40 px-3 text-foreground/80 hover:bg-background/60"
              aria-label="Attach a file"
            >
              <Paperclip className="mr-0 lg:mr-2 h-4 w-4 " />
              <div className="hidden lg:block">
              Attach

              </div>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPublic((v) => !v)}
              className="h-8 rounded-full border border-border/50 bg-background/40 px-3 text-foreground/80 hover:bg-background/60"
              aria-pressed={isPublic}
              aria-label={isPublic ? "Set project to private" : "Set project to public"}
            >
              {isPublic ? (
                <>
                  <Globe className="mr-0 lg:mr-2 h-4 w-4" /> 
                  
                                <div className="hidden lg:block">
              Public

              </div>
                </>
              ) : (
                <>
                  <Lock className="mr-0 lg:mr-2 h-4 w-4" /> 
              <div className="hidden lg:block">
              Private

              </div>
                </>
              )}
            </Button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-border/50 bg-background/40 hover:bg-background/60"
              aria-label="Voice input"
            >
              <Mic className="h-4 w-4 text-foreground/80" />
            </Button>
            <Button
              type="button"
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              aria-label="Send"
              onClick={() => {
                handleSubmit(type);
                 }}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
          ):(

        <div className="mt-3 flex items-center justify-between gap-3">

          {/* Left controls */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full border border-border/50 bg-background/40 hover:bg-background/60"
              aria-label="Add"
            >
              <Plus className="h-4 w-4 text-foreground/80" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-full border border-border/50 bg-background/40 px-3 text-foreground/80 hover:bg-background/60"
              aria-label="Attach a file"
            >
              <Paperclip className="mr-2 h-4 w-4" />
              Attach
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPublic((v) => !v)}
              className="h-8 rounded-full border border-border/50 bg-background/40 px-3 text-foreground/80 hover:bg-background/60"
              aria-pressed={isPublic}
              aria-label={isPublic ? "Set project to private" : "Set project to public"}
            >
              {isPublic ? (
                <>
                  <Globe className="mr-2 h-4 w-4" /> Public
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" /> Private
                </>
              )}
            </Button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-border/50 bg-background/40 hover:bg-background/60"
              aria-label="Voice input"
            >
              <Mic className="h-4 w-4 text-foreground/80" />
            </Button>
            <Button
              type="button"
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              aria-label="Send"
              onClick={() => {
                handleSubmit(type);
                 }}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
          )}

      </div>

      {/* <p className="mt-3 text-xs text-muted-foreground">Design-only UI. Functionality coming soon.</p> */}
    </div>
  )
}
