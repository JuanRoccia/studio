'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Wand2, Image as ImageIcon, Search, Repeat, Upload, CalendarClock, Power, Twitter, CheckCircle, AlertCircle, User, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { expandToThread, type ExpandToThreadInput } from '@/ai/flows/expand-to-thread';
import { analyzeTrends, type AnalyzeTrendsOutput } from '@/ai/flows/analyze-trends';
import { narrativeStages } from '@/ai/narrative-stages';
import { Input } from '../ui/input';
import { refineContent } from '@/ai/flows/refine-content';
import { generateImage } from '@/ai/flows/generate-image';
import { checkTwitterConnection, disconnectTwitter, publishToTwitter } from '@/app/actions/twitter-actions';

interface TwitterUser {
  id: string;
  username: string;
  name: string;
}

interface ConnectionStatus {
  isConnected: boolean;
  user?: TwitterUser;
  error?: string;
}

export function ContentPublisher({ lang, dict, sharedDict }: { lang: string, dict: any, sharedDict: any }) {
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [refineRequest, setRefineRequest] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [trends, setTrends] = useState<AnalyzeTrendsOutput | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    tweetUrl?: string;
  } | null>(null);

  const isThreadComplete = stageIndex >= narrativeStages.length - 1;

  const checkConnection = useCallback(async () => {
    setIsCheckingConnection(true);
    try {
      const result = await checkTwitterConnection();
      setConnectionStatus(result);
    } catch (error) {
      console.error('Error checking connection:', error);
      setConnectionStatus({
        isConnected: false,
        error: 'Failed to check Twitter connection'
      });
    } finally {
      setIsCheckingConnection(false);
    }
  }, []);

  useEffect(() => {
    // This effect handles the callback from the Twitter auth flow.
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const details = searchParams.get('details');

    if (success === 'twitter_connected') {
      toast({
        title: dict.publish.connection_success_title || "Connection Successful!",
        description: dict.publish.connection_success_desc || "Your Twitter account has been connected.",
      });
      // After a successful connection, re-check the status to update the UI
      checkConnection();
      // Clean up the URL by removing search params
      router.replace(`/${lang}/dashboard/publisher`);
    } else if (error) {
      toast({
        variant: 'destructive',
        title: dict.publish.connection_failed_title || "Connection Failed",
        description: decodeURIComponent(details || "An unknown error occurred. Please try again."),
      });
      // Clean up the URL by removing search params
      router.replace(`/${lang}/dashboard/publisher`);
    }
  }, [searchParams, lang, router, toast, checkConnection, dict]);


  useEffect(() => {
    // This effect runs on initial mount to check the connection status.
    checkConnection();
  }, [checkConnection]);
  
  useEffect(() => {
    // This effect populates the content from URL params if available.
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
            language: lang as 'en' | 'es-AR',
        };
        const result = await expandToThread(input);
        const newTweet = `${stageIndex + 1}/ ${result.nextTweet}`;
        const newThreadParts = [...threadParts, newTweet];
        setThreadParts(newThreadParts);
        setContent(newThreadParts.map(p => p.replace(/^\d+\/\s*/, '').trim()).join('\n\n'));
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
    const imagePrompt = initialTheme || content;
    if (!imagePrompt) {
        toast({ variant: "destructive", title: dict.generatedImage.errorTitle, description: dict.generatedImage.errorDescription });
        setIsGeneratingImage(false);
        return;
    }

    toast({ title: sharedDict.toasts.generating_image_title, description: sharedDict.toasts.generating_image_description });
    try {
        const result = await generateImage({ prompt: imagePrompt });
        setGeneratedImage(result.imageDataUri);
        toast({ title: sharedDict.toasts.generate_image_success });
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: sharedDict.toasts.generate_image_error_title, description: sharedDict.toasts.generate_image_error_description });
    } finally {
        setIsGeneratingImage(false);
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
          variant: "destructive",
          title: sharedDict.toasts.upload_image_error_title,
          description: sharedDict.toasts.upload_image_too_large,
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setGeneratedImage(reader.result as string);
        toast({ title: sharedDict.toasts.upload_image_success });
      };
      reader.onerror = () => {
        toast({ variant: "destructive", title: sharedDict.toasts.upload_image_error_title, description: sharedDict.toasts.upload_image_error_description });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCheckTrends = async () => {
    if (!initialTheme) return;
    setIsCheckingTrends(true);
    setTrends(null);
    try {
        const trendResults = await analyzeTrends({ 
            topic: initialTheme, 
            language: lang as 'en' | 'es-AR' 
        });
        setTrends(trendResults);
        toast({ title: sharedDict.toasts.trends_fetched });
    } catch (error) {
        console.error("Failed to analyze trends", error);
        toast({
            variant: "destructive",
            title: dict.trendAnalysis.errorTitle,
            description: dict.trendAnalysis.errorDescription
        });
    } finally {
        setIsCheckingTrends(false);
    }
  };

  const handlePublish = async () => {
    if (!content.trim()) {
      setPublishResult({
        success: false,
        error: 'Please enter some content to publish'
      });
      return;
    }

    if (!connectionStatus?.isConnected) {
      setPublishResult({
        success: false,
        error: 'Please connect your Twitter account first'
      });
      return;
    }

    try {
      setIsPublishing(true);
      setPublishResult(null);
      toast({ title: sharedDict.toasts.publishing_title, description: sharedDict.toasts.publishing_description });
      
      const tweetsToPublish = threadParts.length > 1 ? threadParts : [content];
      const result = await publishToTwitter(tweetsToPublish);
      setPublishResult(result);
      
      if (result.success) {
        setContent('');
        setThreadParts([]);
        setStageIndex(0);
        toast({ title: sharedDict.toasts.publish_success_title, description: result.message });
      } else {
        toast({ variant: 'destructive', title: sharedDict.toasts.publish_error_title, description: result.error });
      }
    } catch (error) {
      console.error('Error publishing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish content';
      setPublishResult({
        success: false,
        error: errorMessage
      });
      toast({ variant: 'destructive', title: sharedDict.toasts.publish_error_title, description: errorMessage });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleConnectTwitter = () => {
    setIsCheckingConnection(true);
    // Redirect to the API route that starts the auth flow
    window.location.href = '/api/twitter/auth';
  };

  const handleDisconnect = async () => {
    setIsCheckingConnection(true);
    const result = await disconnectTwitter();
    if (result.success) {
        await checkConnection();
        toast({ title: dict.publish.disconnect_success_title });
    } else {
        toast({ variant: 'destructive', title: "Disconnection Failed", description: result.error});
    }
    setIsCheckingConnection(false);
  };

  const handleRefineContent = async () => {
    if (!refineRequest || !content) {
        toast({
            variant: "destructive",
            title: dict.refine.errorTitle,
            description: dict.refine.errorDescription,
        });
        return;
    }
    setIsRefining(true);
    toast({ title: sharedDict.toasts.refining_content_title, description: sharedDict.toasts.refining_content_description });

    try {
        const result = await refineContent({
            content,
            request: refineRequest,
            language: lang as 'en' | 'es-AR',
        });
        setContent(result.refinedContent);
        setThreadParts([result.refinedContent]);
        setStageIndex(0);
        setRefineRequest('');
        toast({ title: sharedDict.toasts.refine_success });
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: sharedDict.toasts.refine_error_title, description: sharedDict.toasts.refine_error_description });
    } finally {
        setIsRefining(false);
    }
  }

  const getCharacterCount = () => content.length;
  const isOverLimit = threadParts.length > 1 ? false : getCharacterCount() > 280;
  const progressPercentage = (stageIndex / (narrativeStages.length - 1)) * 100;

  return (
    <div className="space-y-6">
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
              <div className="space-y-2">
                <Textarea 
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setThreadParts([e.target.value]);
                    setStageIndex(0);
                  }}
                  rows={12}
                  placeholder={dict.contentPlaceholder}
                  className={`text-base resize-none ${isOverLimit ? 'border-red-500' : ''}`}
                />
                
                <div className="flex justify-between items-center text-sm">
                  <span className={`${isOverLimit ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {threadParts.length > 1 ? `${threadParts.length} tweets in thread` : `${getCharacterCount()}/280 characters`}
                  </span>
                  
                  <Button
                    onClick={handlePublish}
                    disabled={!connectionStatus?.isConnected || !content.trim() || isOverLimit || isPublishing}
                    size="sm"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        {threadParts.length > 1 ? "Publish Thread" : "Publish Tweet"}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {publishResult && (
                <Alert variant={publishResult.success ? "default" : "destructive"}>
                  {publishResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertDescription>
                    {publishResult.success ? (
                      <div className="space-y-1">
                        <p>{publishResult.message}</p>
                        {publishResult.tweetUrl && (
                          <a href={publishResult.tweetUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 text-xs">
                            View on Twitter →
                          </a>
                        )}
                      </div>
                    ) : (
                      publishResult.error
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-4 pt-4 border-t">
                  <div className="flex flex-wrap gap-2">
                      <Button onClick={handleGenerateThread} disabled={isGeneratingThread || isThreadComplete || isRefining || isGeneratingImage || !content.trim()}>
                          {isGeneratingThread ? <Loader2 className="animate-spin" /> : <Repeat />}
                          {isThreadComplete ? dict.buttons.threadComplete : dict.buttons.expandThread}
                      </Button>
                      <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                          accept="image/png, image/jpeg, image/webp"
                      />
                      <Button onClick={handleGenerateImage} disabled={isGeneratingImage || isRefining || !content.trim()}>
                          {isGeneratingImage ? <Loader2 className="animate-spin" /> : <ImageIcon />}
                          {dict.buttons.generateImage}
                      </Button>
                      <Button onClick={handleUploadClick} variant="outline" disabled={isGeneratingImage || isRefining}>
                          <Upload />
                          {dict.buttons.uploadImage}
                      </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center border-t pt-4">
                      <Input 
                          value={refineRequest}
                          onChange={(e) => setRefineRequest(e.target.value)}
                          placeholder={dict.refine.inputPlaceholder}
                          className="flex-1 min-w-[200px]"
                          disabled={isRefining || isGeneratingImage || !content.trim()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isRefining && refineRequest) {
                              handleRefineContent();
                            }
                          }}
                      />
                      <Button onClick={handleRefineContent} disabled={isRefining || !refineRequest || isGeneratingImage || !content.trim()}>
                          {isRefining ? <Loader2 className="animate-spin" /> : <Wand2 />}
                          {dict.refine.buttonText}
                      </Button>
                  </div>

                  {threadParts.length > 1 && (
                      <div className="space-y-2 pt-4 border-t">
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
                          <Image src={generatedImage} alt={dict.generatedImage.altText} layout="fill" objectFit="cover" data-ai-hint="generated content" />
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
              <Button onClick={handleCheckTrends} disabled={isCheckingTrends || !initialTheme.trim()} className="w-full justify-start text-left">
                  {isCheckingTrends ? <Loader2 className="animate-spin" /> : <Wand2 />}
                  <span className="truncate">{dict.trendAnalysis.buttonText.replace('{topic}', initialTheme || dict.trendAnalysis.buttonDefaultText)}</span>
              </Button>
               {isCheckingTrends && <Skeleton className="h-20 w-full" />}
               {trends && !isCheckingTrends && (
                  <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{dict.trendAnalysis.relatedHashtags}</h4>
                      <div className="flex flex-wrap gap-2">
                          {trends.trends.map(trend => <Badge key={trend} variant="secondary">{trend}</Badge>)}
                      </div>
                      <p className="text-xs text-muted-foreground pt-2 break-words">{trends.summary}</p>
                  </div>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-lg shadow-primary/10 bg-primary/5">
              <CardHeader>
                  <CardTitle className="font-headline text-xl flex items-center gap-2">
                    <Twitter className="h-5 w-5 text-primary" />
                    {dict.publish.connection_title}
                  </CardTitle>
                   {isCheckingConnection ? (
                       <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="ml-2 text-sm">{dict.publish.checking_status}</span>
                        </div>
                   ) : connectionStatus?.isConnected ? (
                      <CardDescription className="flex items-center gap-2 text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span>{dict.publish.connected_status_as.replace('{user}', connectionStatus.user?.username || 'user')}</span>
                      </CardDescription>
                   ) : (
                      <CardDescription className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        {dict.publish.not_connected_status}
                      </CardDescription>
                   )}
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                  {connectionStatus?.isConnected ? (
                    <Button onClick={handleDisconnect} variant="destructive" disabled={isCheckingConnection}>
                        <Power className="mr-2 w-4 h-4" />
                        {dict.publish.disconnect_button}
                    </Button>
                  ) : (
                    <Button onClick={handleConnectTwitter} disabled={isCheckingConnection}>
                        <Twitter className="mr-2 h-4 w-4" />
                        {dict.publish.connect_button}
                    </Button>
                  )}
                  {connectionStatus?.error && !connectionStatus.isConnected &&(
                      <Alert variant="destructive" className="text-xs">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{connectionStatus.error}</AlertDescription>
                      </Alert>
                  )}
                  
                  <Separator className='my-2' />

                  <Button asChild variant="outline" size="lg" disabled={!connectionStatus?.isConnected}>
                      <Link href={{
                        pathname: `/${lang}/dashboard/scheduler`,
                        query: { 
                          content: content, 
                          theme: initialTheme, 
                          image: generatedImage || ''
                        }
                      }}>
                          <CalendarClock />
                          {dict.publish.scheduleButton}
                      </Link>
                  </Button>
              </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
