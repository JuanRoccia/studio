"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  CheckCircle2,
  Twitter,
  Instagram,
  Clapperboard,
} from "lucide-react";
import { ComponentType } from "react";

type Task = {
  platform: "Twitter" | "Instagram" | "TikTok";
  time: string;
  title: string;
  description: string;
  status: "Completed" | "Pending";
};

const tasks: Task[] = [
  {
    platform: "Twitter",
    time: "09:00 AM",
    title: "Morning Thread",
    description: "Post a thread about today's main conspiracy theme.",
    status: "Completed",
  },
  {
    platform: "Instagram",
    time: "12:30 PM",
    title: "Story Teaser",
    description: "Share a cryptic image related to the book on Stories.",
    status: "Completed",
  },
  {
    platform: "TikTok",
    time: "04:00 PM",
    title: "Video Short",
    description: "Create a short video debunking a common 'fact'.",
    status: "Pending",
  },
  {
    platform: "Twitter",
    time: "08:00 PM",
    title: "Engage with Followers",
    description: "Reply to comments and DMs from the day.",
    status: "Pending",
  },
];

const platformIcons: { [key in Task["platform"]]: ComponentType<{ className?: string }> } = {
  Twitter: Twitter,
  Instagram: Instagram,
  TikTok: Clapperboard,
};

export function TaskScheduler() {
  return (
    <Card className="h-full shadow-lg shadow-primary/10">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-primary" />
          Daily Tasks & Optimal Times
        </CardTitle>
        <CardDescription>
          Your automated schedule for maximum impact.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task, index) => {
            const Icon = platformIcons[task.platform];
            return (
              <div key={index}>
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <Icon className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">{task.time}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">{task.title}</h4>
                      <Badge variant={task.status === 'Completed' ? 'secondary' : 'default'} className={task.status === 'Completed' ? 'bg-green-700/50 text-green-300 border-none' : 'bg-primary/80'}>
                        {task.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  </div>
                </div>
                {index < tasks.length - 1 && <Separator className="my-4" />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
