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
import { Progress } from '@/components/ui/progress';
import { expandToThread, type ExpandToThreadInput } from '@/ai/flows/expand-to-thread';
import { narrativeStages } from '@/ai/narrative-stages';

export function ContentPublisher({ dict, sharedDict }: { dict: any, sharedDict: any }) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const initialContent = searchParams.get('content') || '';
  const initialTheme = searchParams.get('theme') || '';

  const [content, setContent] = useState(initialContent);
  const [threadParts, setThreadParts] = useState<string[]>(initialContent ? [initialContent] : []);
  const [stageIndex, setStageIndex] = useState(0);

  const [isGeneratingThread, setIsGeneratingThread] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isCheckingTrends, setIsCheckingTrends] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [trends, setTrends] = useState<string[]>([]);

  const isThreadComplete = stageIndex >= narrativeStages.length -1;

  useEffect(() => {
    setContent(initialContent);
    if(initialContent) {
        setThreadParts([initialContent]);
        setStageIndex(0);
    }
  }, [initialContent]);

  const handleGenerateThread = async () => {
    if (isThreadComplete) return;

    setIsGeneratingThread(true);
    const currentStage = narrativeStages[stageIndex];
    toast({ title: sharedDict.toasts.expanding_thread_title.replace('{stage}', currentStage), description: sharedDict.toasts.expanding_thread_description });

    try {
        const input: ExpandToThreadInput = {
            initialContent: threadParts[0],
            currentThread: threadParts,
            currentStage: currentStage,
        };
        const result = await expandToThread(input);
        const newThreadParts = [...threadParts, `\n\n${stageIndex + 1}/ ${result.nextTweet}`];
        setThreadParts(newThreadParts);
        setContent(newThreadParts.join(''));
        setStageIndex(prev => prev + 1);
        toast({ title: sharedDict.toasts.expand_success});
    } catch(error) {
        console.error(error);
        toast({ variant: "destructive", title: sharedDict.toasts.expand_error_title, description: sharedDict.toasts.expand_error_description });
    } finally {
        setIsGeneratingThread(false);
    }
  };
  
  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setGeneratedImage(null);
    toast({ title: sharedDict.toasts.generating_image_title, description: sharedDict.toasts.generating_image_description });
    // Placeholder for AI flow call
    await new Promise(res => setTimeout(res, 3000));
    setGeneratedImage("https://placehold.co/1200x675.png");
    toast({ title: sharedDict.toasts.generate_image_success });
    setIsGeneratingImage(false);
  };
  
  const handleCheckTrends = async () => {
    setIsCheckingTrends(true);
    // Placeholder for AI flow call
    await new Promise(res => setTimeout(res, 1500));
    setTrends(["#DarkWebMysteries", "#CodedMessages", "#GlobalEnigma"]);
    toast({ title: sharedDict.toasts.trends_fetched });
    setIsCheckingTrends(false);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    toast({ title: sharedDict.toasts.publishing_title, description: sharedDict.toasts.publishing_description });
    await new Promise(res => setTimeout(res, 2000));
    toast({ title: sharedDict.toasts.publish_success_title, description: sharedDict.toasts.publish_success_description });
    setIsPublishing(false);
  }

  const progressPercentage = (stageIndex / (narrativeStages.length - 1)) * 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 flex flex-col gap-8">
        <Card className="shadow-lg shadow-primary/10">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <Send className="w-6 h-6 text-primary" />
              {dict.title}
            </CardTitle>
            <CardDescription>
              {dict.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              placeholder={dict.contentPlaceholder}
              className="text-base"
            />
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleGenerateThread} disabled={isGeneratingThread || isThreadComplete}>
                        {isGeneratingThread ? <Loader2 className="animate-spin" /> : <Repeat />}
                        {isThreadComplete ? dict.buttons.threadComplete : dict.buttons.expandThread}
                    </Button>
                    <Button onClick={handleGenerateImage} disabled={isGeneratingImage}>
                        {isGeneratingImage ? <Loader2 className="animate-spin" /> : <ImageIcon />}
                        {dict.buttons.generateImage}
                    </Button>
                </div>
                {threadParts.length > 1 && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>{dict.narrativeProgress.title}</span>
                            <span>{isThreadComplete ? dict.narrativeProgress.complete : narrativeStages[stageIndex]}</span>
                        </div>
                        <Progress value={progressPercentage} className="w-full h-2" />
                    </div>
                )}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg shadow-primary/10">
            <CardHeader>
                <CardTitle className="font-headline text-xl">{dict.generatedImage.title}</CardTitle>
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
                        <p className="text-muted-foreground">{dict.generatedImage.placeholder}</p>
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
                {dict.trendAnalysis.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleCheckTrends} disabled={isCheckingTrends || !initialTheme} className="w-full justify-start text-left">
                {isCheckingTrends ? <Loader2 className="animate-spin" /> : <Wand2 />}
                <span className="truncate">{dict.trendAnalysis.buttonText.replace('{topic}', initialTheme || dict.trendAnalysis.buttonDefaultText)}</span>
            </Button>
            {trends.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-semibold text-sm">{dict.trendAnalysis.relatedHashtags}</h4>
                    <div className="flex flex-wrap gap-2">
                        {trends.map(trend => <Badge key={trend} variant="secondary">{trend}</Badge>)}
                    </div>
                </div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-lg shadow-primary/10 bg-primary/5">
            <CardHeader>
                <CardTitle className="font-headline text-xl">{dict.publish.title}</CardTitle>
            </CardHeader>
            <CardContent>
                <Button onClick={handlePublish} disabled={isPublishing} className="w-full" size="lg">
                    {isPublishing ? <Loader2 className="animate-spin" /> : <Send />}
                    {dict.publish.buttonText}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">{dict.publish.description}</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
