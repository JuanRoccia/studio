"use client";
    
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, ArrowRight } from "lucide-react";

type GeneratedThemesListProps = {
  themes: string[];
  showAlignerButton?: boolean;
};

export function GeneratedThemesList({ themes, showAlignerButton = false }: GeneratedThemesListProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const handleCopy = (theme: string, index: number) => {
    navigator.clipboard.writeText(theme).then(() => {
      setCopiedIndex(index);
      toast({
        title: "Theme copied to clipboard",
      });
      setTimeout(() => setCopiedIndex(null), 2000);
    }).catch(err => {
      console.error("Failed to copy: ", err);
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Could not copy theme to clipboard.",
      });
    });
  };

  return (
    <div className="space-y-4">
      <ul className="list-none space-y-3 bg-secondary/30 p-6 rounded-md">
        {themes.map((theme, index) => (
          <li key={index} className="flex items-start sm:items-center justify-between gap-4 text-foreground/90 flex-col sm:flex-row">
            <span className="flex-1 break-words">{theme}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(theme, index)}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground self-end sm:self-center"
              aria-label="Copy theme"
            >
              {copiedIndex === index ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </li>
        ))}
      </ul>

      {showAlignerButton && (
        <div className="flex justify-end pt-2">
            <Button asChild size="lg">
                <Link href="/dashboard/content-aligner">
                    Continue to Content Aligner
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </div>
      )}
    </div>
  );
}
