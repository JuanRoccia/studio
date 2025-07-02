'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Twitter,
  Instagram,
  Clapperboard,
  Bot,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Wand2,
} from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import type { ComponentType } from 'react';
import Image from 'next/image';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  generateEngagementStrategy,
  type GenerateEngagementStrategyInput,
  type GenerateEngagementStrategyOutput,
} from '@/ai/flows/generate-engagement-strategy';
import { Skeleton } from '../ui/skeleton';

type TaskPlatform = 'Twitter' | 'Instagram' | 'TikTok';
type Task = {
  id: number;
  platform: TaskPlatform;
  time: string;
  title: string;
  description: string;
  status: 'Completed' | 'Pending';
  image?: string;
};

const platformIcons: { [key in TaskPlatform]: ComponentType<{ className?: string }> } = {
  Twitter: Twitter,
  Instagram: Instagram,
  TikTok: Clapperboard,
};

// Mock data for scheduled tasks
const initialTasks: Task[] = [
    { id: 1, platform: 'Twitter', time: '09:00', title: 'Morning Thread: The Simulation Hypothesis', description: 'Is our reality a sophisticated computer program? A thread exploring the evidence.', status: 'Completed' },
    { id: 2, platform: 'Instagram', time: '12:30', title: 'Story Teaser: Ancient Symbols', description: 'Post a cryptic image of an ancient symbol related to the book.', status: 'Completed' },
    { id: 3, platform: 'TikTok', time: '16:00', title: 'Video: Debunking "Fact"', description: 'A short, fast-paced video questioning a commonly accepted historical "fact".', status: 'Pending' },
    { id: 4, platform: 'Twitter', time: '20:00', title: 'Engage with Followers', description: 'Reply to comments and DMs from the day.', status: 'Pending' },
];

export function SchedulerPage({ lang, dict, sharedDict }: { lang: string, dict: any, sharedDict: any }) {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>();
  const [tasks, setTasks] = useState<{ [key: string]: Task[] }>({
    [format(new Date(), 'yyyy-MM-dd')]: initialTasks,
  });
  
  const [engagementStrategy, setEngagementStrategy] = useState<GenerateEngagementStrategyOutput | null>(null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [strategyOptions, setStrategyOptions] = useState({
      taskType: 'Comment',
      style: 'Nietzschean',
      topic: 'The recent surge in UFO sightings'
  });

  useEffect(() => {
    // This ensures new Date() is only called on the client, after hydration.
    setDate(new Date());
  }, []);

  const selectedDayTasks = date ? tasks[format(date, 'yyyy-MM-dd')] || [] : [];
  
  // Effect to handle content passed from the Publisher page
  useEffect(() => {
    const content = searchParams.get('content');
    const image = searchParams.get('image');
    const theme = searchParams.get('theme');

    if (content && date) {
      const dayKey = format(date, 'yyyy-MM-dd');
      const newTasks = [...(tasks[dayKey] || [])];
      const newTask: Task = {
        id: Date.now(),
        platform: 'Twitter',
        time: '18:00', // Default time for scheduled posts
        title: theme || dict.tasks.defaultTitle,
        description: content,
        status: 'Pending',
        image: image || undefined,
      };
      
      setTasks(prev => ({
        ...prev,
        [dayKey]: [...(prev[dayKey] || []), newTask]
      }));

      toast({ title: dict.toasts.postScheduledTitle, description: dict.toasts.postScheduledDescription });
    }
  }, [searchParams, date]);

  const handleGenerateStrategy = async () => {
    setIsGeneratingStrategy(true);
    setEngagementStrategy(null);
    try {
        const result = await generateEngagementStrategy({
            ...strategyOptions,
            language: lang as 'en' | 'es-AR',
        });
        setEngagementStrategy(result);
    } catch(e) {
        console.error(e);
        toast({ variant: 'destructive', title: dict.toasts.strategyErrorTitle, description: dict.toasts.strategyErrorDescription });
    } finally {
        setIsGeneratingStrategy(false);
    }
  };


  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-8">
        <Card className="shadow-lg shadow-primary/10">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <CalendarClock className="w-6 h-6 text-primary" />
              {dict.title}
            </CardTitle>
            <CardDescription>{dict.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col lg:flex-row gap-8">
            {date ? (
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                today={date}
                className="rounded-md border self-start"
              />
            ) : (
              <div className="rounded-md border self-start">
                <Skeleton className="w-[280px] h-[321px]" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-lg font-headline mb-4">
                {dict.tasks.header.replace('{date}', date ? format(date, 'PPP') : '')}
              </h3>
              <div className="space-y-4 h-[300px] overflow-y-auto pr-4">
                {selectedDayTasks.length > 0 ? (
                  selectedDayTasks.map((task, index) => {
                    const Icon = platformIcons[task.platform];
                    return (
                      <div key={task.id}>
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <Icon className="w-6 h-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground mt-1">{task.time}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-2">
                              <h4 className="font-semibold break-words">{task.title}</h4>
                              <Badge variant={task.status === 'Completed' ? 'secondary' : 'default'} className={task.status === 'Completed' ? 'bg-green-700/50 text-green-300 border-none' : 'bg-primary/80'}>
                                {task.status === 'Completed' ? dict.tasks.statusCompleted : dict.tasks.statusPending}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground break-words">{task.description}</p>
                             {task.image && (
                                <div className="relative aspect-video rounded-md overflow-hidden border mt-2 w-32">
                                    <Image src={task.image} alt="Scheduled post image" layout="fill" objectFit="cover" />
                                </div>
                            )}
                          </div>
                        </div>
                        {index < selectedDayTasks.length - 1 && <Separator className="my-4" />}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground">{dict.tasks.noTasks}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-1 space-y-8">
        <Card className="shadow-lg shadow-primary/10">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              {dict.engagement.title}
            </CardTitle>
            <CardDescription>{dict.engagement.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">{dict.engagement.topicLabel}</label>
              <Textarea 
                value={strategyOptions.topic}
                onChange={(e) => setStrategyOptions(prev => ({...prev, topic: e.target.value}))}
                placeholder={dict.engagement.topicPlaceholder} 
                rows={3} 
              />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium">{dict.engagement.typeLabel}</label>
                     <Select value={strategyOptions.taskType} onValueChange={(value) => setStrategyOptions(prev => ({...prev, taskType: value as 'Comment' | 'Direct Message'}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Comment">{dict.engagement.types.comment}</SelectItem>
                            <SelectItem value="Direct Message">{dict.engagement.types.dm}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <label className="text-sm font-medium">{dict.engagement.styleLabel}</label>
                     <Select value={strategyOptions.style} onValueChange={(value) => setStrategyOptions(prev => ({...prev, style: value as 'Nietzschean' | 'Socratic' | 'Stoic'}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Nietzschean">{dict.engagement.styles.nietzschean}</SelectItem>
                            <SelectItem value="Socratic">{dict.engagement.styles.socratic}</SelectItem>
                            <SelectItem value="Stoic">{dict.engagement.styles.stoic}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Button onClick={handleGenerateStrategy} disabled={isGeneratingStrategy} className="w-full">
                {isGeneratingStrategy ? <Loader2 className="animate-spin" /> : <Wand2 />}
                {dict.engagement.buttonText}
            </Button>
            
            {isGeneratingStrategy && <Skeleton className="h-28 w-full" />}
            {engagementStrategy && (
                <div className="space-y-4 pt-4 border-t">
                    <div>
                        <h4 className="font-semibold">{dict.engagement.results.strategyTitle}</h4>
                        <p className="text-xs text-muted-foreground break-words">{engagementStrategy.strategy}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold">{dict.engagement.results.textTitle}</h4>
                        <p className="text-sm bg-secondary/50 p-2 rounded-md break-words">{engagementStrategy.suggestedText}</p>
                    </div>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
