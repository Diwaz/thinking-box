"use client"

import React from 'react';
import { Card } from '@/components/ui/card';

export interface PromptSuggestion {
  id: string;
  name: string;
  logo: React.ReactNode;
  prompt: string;
  badge?: string;
}

interface PromptSuggestionsProps {
  suggestions: PromptSuggestion[];
  onSuggestionClick: (prompt: string) => void;
}

export function PromptSuggestions({
  suggestions,
  onSuggestionClick,
}: PromptSuggestionsProps) {
  return (
    <div className="w-full  flex justify-center px-2">
      <div className="flex flex-wrap gap-1 sm:gap-3 justify-center w-full sm:w-[70%]">
        {suggestions.map((suggestion) => (
          <Card
            key={suggestion.id}
            onClick={() => onSuggestionClick(suggestion.prompt)}
            className="rounded-sm flex items-center gap-2 px-4 py-2 bg-[#252525]/50  backdrop-blur-xl  hover:bg-[#2d2d2d] cursor-pointer transition-all duration-200"

          >
            <div className="flex items-center gap-2">
              <div className="text-sm">{suggestion.logo}</div>
              <span className="text-sm font-medium text-[#e5e5e5]">
                {suggestion.name}
              </span>
            
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}