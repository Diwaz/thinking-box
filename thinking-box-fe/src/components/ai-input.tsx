"use client"

import {  useEffect, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {  ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import handleRequest from "@/utils/request"
import { FileNode } from "./fileTree"
import { From, MessagePacket } from "@/app/project/[id]/page"
import { toast } from "sonner"
import { Spinner } from "./ui/spinner"
import { signIn, useSession } from "@/lib/auth-client"


type InputProps = {
  type: string,
  projectId?: string,
  userId?: string,
  changeFileState?: React.Dispatch<React.SetStateAction<FileNode[]>>,
  setMessages?: React.Dispatch<React.SetStateAction<MessagePacket[]>>;
  loadingState?: boolean,
  // onSuggestionSelected?: (prompt: string) => void,
}


export function AIInput({
  type,
  projectId,
  changeFileState,
  setMessages,
  loadingState,
}: InputProps) {
  const router = useRouter();
  const [value, setValue] = useState("")
  const [Isloading,setIsLoading] = useState(false);
  const {data:session} = useSession()
  const userId = session?.user.id;

useEffect(()=>{
  // const {data:session} = useSession()
},[])

  const handleLogin = async ()=>{
    // if (value.length > 0 ){
    // }
await signIn.social({
									provider: "google",
									callbackURL: "http://localhost:3000",
									fetchOptions: {
										onRequest: () => {
											setIsLoading(true);
										},
										onResponse: () => {
											setIsLoading(false);
										},
									},
								});
  }
  const handleSubmit = async(type:string) =>{
    if (type === "initial"){
                 const projectId = crypto.randomUUID();
                const options ={
                  body:{
                    projectId,
                    initialPrompt:value
                  }
                }
                try {
                  setIsLoading(true);
                   const hasProject =await handleRequest("POST",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/project`,options)
                   console.log("result of creation projec",hasProject)
                   if (hasProject.error){
          toast(hasProject.error)
                 return ;
                  }
                  setIsLoading(false);
                  console.log("uuid",projectId)
                  router.push(`/project/${projectId}`)
                }catch(err:unknown){
                  if (err instanceof Error){
                    toast.error(err.message)
                  }else {
                    toast.error("Something went wrong")
                  }
                  setIsLoading(false);
                }
    }else{
        console.log("handle secondary")
        setIsLoading(true);
        try {

          const options = {
            body :{
              prompt: value,
              projectId,
            }
          }
          setMessages!(prev => [...prev,
            {
              content: value,
              from:From.USER 
            }
          ]); 
          setValue(""); 
          await handleRequest("POST","http://localhost:8080/prompt",options)    
          // console.log("cleared session storage")
          sessionStorage.removeItem(`project_tree_${projectId}`)
          
          sessionStorage.removeItem(`project_URL_${projectId}`);
          // console.log(sessionStorage.getItem(`project_tree_${projectId}`));
          changeFileState!([]);
        }catch(err){
          if (err instanceof Error){
            toast.error(err.message);
          }else{
            toast.error("Something went wrong!")
          }
        }


    }
  }

  // const handleSuggestionClick = (prompt: string) => {
  //   setValue(prompt);
  //   if (onSuggestionSelected) {
  //     onSuggestionSelected(prompt);
  //   }
  // };

  return (
    <div className="w-full p-2">
      <div
        className="mx-auto w-full  max-w-xl rounded-lg  border border-border/50 bg-card/70 p-2   backdrop-blur-xl "
        role="group"
        aria-label="AI prompt composer"
      >
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onInput={e => {
            const target = e.currentTarget;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 240) + "px"; // 240px = max-height
          }}
          placeholder="Explain your thought"
          className="min-h-20 resize-none border-0  px-2 text-xs leading-6 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 md:min-h-24 md:text-base"
          aria-label="Prompt"
          style={{ maxHeight: "240px", overflowY: "auto" }}
        />
          {type === "secondary" ? (

        <div className=" flex items-center justify-end gap-3">

          <div className="flex items-center gap-2">
           
            <Button
              type="button"
              className="h-9 w-9 rounded-lg bg-[#05001E] text-white hover:bg-[#05001E]/70 cursor-pointer"
              aria-label="Send"
              disabled={value.length < 1 || loadingState}
              onClick={() => {
                handleSubmit(type);
                 }}
            >
              {loadingState ? (
                  <Spinner/>
                 )
                : (

                  <ArrowRight className="h-4 w-4" />
                )
                }
            </Button>
          </div>
        </div>
          ):(

        <div className=" flex items-center justify-end">


          <div className="flex items-center gap-2">
            {userId ? (<Button
              type="button"
              className="h-9 p-2 rounded-lg bg-[#05001E] text-white hover:bg-[#05001E]/70 cursor-pointer "
              disabled={value.length < 1 || Isloading}
              aria-label="Send"
              onClick={() => {
                handleSubmit(type);
                 }}
            >
              <div>
              Generate
              </div>
                 {Isloading ? (
                  <Spinner/>
                 )
                : (

                  <ArrowRight className="h-4 w-4" />
                )
                }

            </Button>):(<Button
              type="button"
              className="h-9 p-2 rounded-lg bg-[#05001E] text-white hover:bg-[#05001E]/70 cursor-pointer "
              // disabled={}
              aria-label="Send"
              onClick={() => {
                handleLogin();
                 }}
            >
              <div>
              Login
              </div>
                 {Isloading ? (
                  <Spinner/>
                 )
                : (

                  <ArrowRight className="h-4 w-4" />
                )
                }

            </Button>)}
            
          </div>
        </div>
          )}

      </div>

      {/* <p className="mt-3 text-xs text-muted-foreground">Design-only UI. Functionality coming soon.</p> */}
    </div>
  )
}
