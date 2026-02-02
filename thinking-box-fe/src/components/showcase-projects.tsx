"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import  handleRequest  from '@/utils/request';
import { Card } from '@/components/ui/card';

export interface ShowcaseProject {
  id: string;
  title: string;
  description?: string;
  userName: string;
  userImage?: string;
  thumbnail: string;
  viewedDate: string;
  projectUri?: string;
}

// Dummy data for now
const DUMMY_PROJECTS: ShowcaseProject[] = [
  {
    id: "1",
    title: "Apex Trader",
    description: "Advanced trading dashboard with real-time analytics",
    userName: "Design Studio",
    userImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Design",
    thumbnail: "/tb-thumbnail.png",
    viewedDate: "Viewed 4 days ago",
    projectUri: "https://example.com/apex-trader"
  },
  {
    id: "2",
    title: "Simple Payments",
    description: "Payment processing made easy",
    userName: "Dev Team",
    userImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=DevTeam",
    thumbnail: "/tb-thumbnail.png",
    viewedDate: "Viewed 31 Dec 2025",
    projectUri: "https://example.com/simple-payments"
  },
  {
    id: "3",
    title: "Portfolio Site",
    description: "Payment processing made easy",
    userName: "Dev Team",
    userImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=DevTeam",
    thumbnail: "/tb-thumbnail.png",
    viewedDate: "Viewed 31 Dec 2025",
    projectUri: "https://example.com/simple-payments"
  },
];

export const ShowcaseProjects = () => {
  const [projects, setProjects] = useState<ShowcaseProject[]>(DUMMY_PROJECTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShowcaseProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        // Uncomment when API is ready
        // const response = await handleRequest(
        //   "GET",
        //   `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/showcase`
        // );
        // if (response.error) {
        //   setError(response.error);
        //   return;
        // }
        // setProjects(response.projects || DUMMY_PROJECTS);
        
        // For now, using dummy data
        setProjects(DUMMY_PROJECTS);
      } catch (err) {
        console.error("Failed to fetch showcase projects:", err);
        setError("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };

    fetchShowcaseProjects();
  }, []);

  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (name: string): string => {
    const colors = [
      "bg-pink-500",
      "bg-purple-500",
      "bg-blue-500",
      "bg-cyan-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-indigo-500",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (error) {
    return (
      <div className="w-full text-center py-5">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full py-5">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl md:text-4xl font-bold text-white mb-2">
          Showcase Projects
        </h2>
        <p className="text-gray-400 mb-8 ">
          Explore projects built with Thinking-Box
        </p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3,4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-[#252525] rounded-xl h-48 mb-4"></div>
                <div className="bg-[#252525] rounded h-4 w-3/4 mb-2"></div>
                <div className="bg-[#252525] rounded h-3 w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <a
                key={project.id}
                href={project.projectUri || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group cursor-pointer"
              >
                <Card className="bg-[#05171C] border-[#404040] hover:border-[#0070F3] overflow-hidden transition-all duration-300 h-full flex flex-col gap-1 p-0">
                  {/* Thumbnail */}
                  <div className="relative h-48 w-full overflow-hidden bg-[#252525]">
                    <Image
                      src={project.thumbnail}
                      alt={project.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1F1F1F] via-transparent to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-300"></div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                


                    {/* User Info */}
                    <div className="flex items-center ">
                      {/* Avatar */}
                      <div
                        className={`flex bg-[#05001E] items-center justify-center w-10 h-10 rounded-full flex-shrink-0`}
                      >
                        <span className="text-white font-bold text-sm">
                          {getInitial(project.userName)}
                        </span>
                      </div>

                      {/* User Details */}
                      <div className="flex-1 min-w-0  flex-col items-start">
                        <p className="text-sm font-medium text-white truncate  flex justify-start px-2">
                          {project.title}
                        </p>
                        <p className="text-xs text-gray-500 flex justify-start px-2">
                          {project.userName}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
