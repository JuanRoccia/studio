'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Send, Wand2, Image as ImageIcon, Search, Repeat } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

export function ContentPublisher() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const initialContent = searchParams.get('content') || '';
  const initialTheme = searchParams.get('theme') || '';

  const [content, setContent] = useState(initialContent);
  const [isGeneratingThread, setIsGeneratingThread] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isCheckingTrends, setIsCheckingTrends] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [trends, setTrends] = useState<string[]>([]);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleGenerateThread = async () => {
    setIsGeneratingThread(true);
    toast({ title: "Expanding to thread...", description: "This will take a moment." });
    // Placeholder for AI flow call
    await new Promise(res => setTimeout(res, 2000));
    setContent(content + "\n\n1/ This is the first tweet in a new thread, expanding on the original idea. The AI can elaborate on key points, add details, and structure it for maximum engagement. #TruthRevealed");
    toast({ title: "Thread expanded!"});
    setIsGeneratingThread(false);
  };
  
  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setGeneratedImage(null);
    toast({ title: "Generating related image...", description: "The AI is creating a visual masterpiece." });
    // Placeholder for AI flow call
    await new Promise(res => setTimeout(res, 3000));
    setGeneratedImage("https://placehold.co/1200x675.png");
    toast({ title: "Image generated successfully!" });
    setIsGeneratingImage(false);
  };
  
  const handleCheckTrends = async () => {
    setIsCheckingTrends(true);
    // Placeholder for AI flow call
    await new Promise(res => setTimeout(res, 1500));
    setTrends(["#DarkWebMysteries", "#CodedMessages", "#GlobalEnigma"]);
    toast({ title: "Latest trends fetched." });
    setIsCheckingTrends(false);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    toast({ title: "Publishing content...", description: "Connecting to the social matrix..." });
    await new Promise(res => setTimeout(res, 2000));
    toast({ title: "Content Published!", description: "Your message has been broadcast." });
    setIsPublishing(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 flex flex-col gap-8">
        <Card className="shadow-lg shadow-primary/10">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <Send className="w-6 h-6 text-primary" />
              Content Publisher
            </CardTitle>
            <CardDescription>
              Refine, enhance, and publish your generated content. The final step in your creation workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Your content goes here..."
              className="text-base"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGenerateThread} disabled={isGeneratingThread}>
                {isGeneratingThread ? <Loader2 className="animate-spin" /> : <Repeat />}
                Expand to Thread
              </Button>
               <Button onClick={handleGenerateImage} disabled={isGeneratingImage}>
                {isGeneratingImage ? <Loader2 className="animate-spin" /> : <ImageIcon />}
                Generate Image
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg shadow-primary/10">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Generated Image</CardTitle>
            </CardHeader>
            <CardContent>
                {isGeneratingImage && <Skeleton className="w-full aspect-video rounded-md" />}
                {generatedImage && !isGeneratingImage && (
                     <div className="relative aspect-video rounded-md overflow-hidden border">
                        <Image src={generatedImage} alt="Generated by AI" layout="fill" objectFit="cover" data-ai-hint="conspiracy theory" />
                     </div>
                )}
                {!generatedImage && !isGeneratingImage && (
                    <div className="flex items-center justify-center aspect-video rounded-md border border-dashed bg-secondary/50">
                        <p className="text-muted-foreground">Image will appear here</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 flex flex-col gap-8">
        <Card className="shadow-lg shadow-primary/10">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
                <Search />
                Trend Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleCheckTrends} disabled={isCheckingTrends || !initialTheme} className="w-full justify-start text-left">
                {isCheckingTrends ? <Loader2 className="animate-spin" /> : <Wand2 />}
                <span className="truncate">Check Trends for "{initialTheme || 'Topic'}"</span>
            </Button>
            {trends.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Related Hashtags:</h4>
                    <div className="flex flex-wrap gap-2">
                        {trends.map(trend => <Badge key={trend} variant="secondary">{trend}</Badge>)}
                    </div>
                </div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-lg shadow-primary/10 bg-primary/5">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Publish</CardTitle>
            </CardHeader>
            <CardContent>
                <Button onClick={handlePublish} disabled={isPublishing} className="w-full" size="lg">
                    {isPublishing ? <Loader2 className="animate-spin" /> : <Send />}
                    Publish Now
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">Publishes to linked Twitter account.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
