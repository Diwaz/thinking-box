"use client";

import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import handleRequest from '@/utils/request';
import React, { useEffect, useState } from 'react'


export interface FileNode{
    name:string,
    path:string,
    type:'file'|'folder',
    content?:string,
    children?:FileNode[]
}

export interface Files{
    path:string,
    content:string
}

   export  const buildFileTree = (files:Array<Files>):FileNode[] =>{
            const root : FileNode = {
                name: 'root',
                path:'/',
                type: 'folder',
                children:[]
            }
        for(const file of files){
        const relativePath = file.path.replace('/home/user','');
        const parts = relativePath.split('/').filter(p=>p);
        // console.log("log 1",parts)
        
        let currentLevel = root;
        for(let i=0; i< parts.length; i++){
            const part = parts[i];
            const isLastPart = i === parts.length - 1;

            let existingNode = currentLevel.children?.find(child=>child.name === part)
            
            if(!existingNode){
                const newNode :FileNode={
                    name:part,
                    path:file.path.substring(0, file.path.indexOf(part) + part.length),
                    type:isLastPart?'file':'folder',
                    children:isLastPart?undefined:[]
                }
            //    console.log("new node",newNode) 
                if(isLastPart){
                    newNode.content = file.content;
                }
                
                currentLevel.children!.push(newNode)
                existingNode = newNode;
            } else if(isLastPart) {
                // UPDATE: If file already exists, update its content
                existingNode.content = file.content;
            }
            
            currentLevel = existingNode
        }   
    }
    return root.children || [];
    }


interface FileTreeProps {
  nodes: FileNode[],
  onFileClick: (file: FileNode) => void
}

export function FileTree({ nodes, onFileClick }: FileTreeProps) {
  return (
    <div className='file-tree'>
      {nodes.map((node, index) => (
        <FileTreeNode key={index} node={node} onFileClick={onFileClick} />
      ))}
    </div>
  )
}

interface FileTreeNodeProps {
  node: FileNode,
  onFileClick: (file: FileNode) => void
}

//Its job is to render ONE node (file or folder) and handle user interactions 
function FileTreeNode({ node, onFileClick }: FileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const handleClick = () => {
    if (node.type === 'folder') {
      setIsOpen(!isOpen)
    } else {
      onFileClick(node)
    }
  }
  console.log("nodes",node)
  return (
    <div className='file-tree-node'>
      <div onClick={handleClick} className='flex items-center gap-2 px-2 py-1  cursor-pointer'>
        {node.type === 'folder' ? (
          <>
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Folder size={16} />
          </>
        ) : (
        <>
          <div className="w-4" /> {/* Spacer */}
          <File size={16} />
        </>
        )}
      <span className='text-sm'>{node.name}</span>
      </div>

      {node.type==='folder' && isOpen && node.children && (
        <div className='ml-4'>
          {node.children.map((child, index)=>(
            <FileTreeNode key={index} node={child} onFileClick={onFileClick}  />
          ))}
        </div>
      )}
    </div>
  )
}