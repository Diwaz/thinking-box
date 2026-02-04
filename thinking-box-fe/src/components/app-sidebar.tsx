"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  FileKey,
  Drone,
  Map,
  Codesandbox,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import handleRequest from "@/utils/request"
import SignIn from "./sign-in"
import { getSession } from "better-auth/api"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"

// This is sample data.

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Thinking-Box",
      logo: Codesandbox,
      plan: "Hobby Plan",
    },
  ],
  navMain: [
    {
      title: "Workflows",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Credentials",
      url: "#",
      icon: FileKey,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}
export interface Project {
    id: string,
    title:string,
    initialPrompt:string,
    userId:string,
}

export  function  AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
        React.useEffect(()=>{
                
                const fetchProjects =async ()=>{
                  try {

                    const response = await handleRequest("GET",`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/project/list`);
                    // console.log("response projectsss",response.action)
                    // if (response.error){
                    //   toast(response.error)
                    //   return ;
                    // }
                    const filteredProjects = response.projects.filter((item:Project)=>item.title);
                    setProjects(filteredProjects);
                  }catch(err:unknown){
                    if (err instanceof Error){
                      // toast(err)
                    }
                  }
                }

                 fetchProjects();
        },[])
       const [projects,setProjects]= React.useState<Project[]>([]) 

const sessionData =  authClient.useSession();
const hasSession = sessionData.data;
let userData;
if (hasSession){
    userData = {
        name: hasSession.user.name,
        email:hasSession.user.email,
        avatar:hasSession.user.image ?? "https://avatars.githubusercontent.com/u/124599?v=4"
    }
}
  return (
    <Sidebar collapsible="icon"    {...props}>
      <SidebarHeader>
    <SidebarTrigger  />
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {
          hasSession && 
        <NavProjects projects={projects} />
        }
      </SidebarContent>
      <SidebarFooter>
        {
            hasSession ?  (

                <NavUser user={userData!} />
            ):(

                <SignIn/> 
            )
        }

      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}