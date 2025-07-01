"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ShieldCheck } from "lucide-react";

export function PromotionCards({ dict }: { dict: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card className="shadow-lg shadow-primary/10 overflow-hidden">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            {dict.book.title}
          </CardTitle>
          <CardDescription>
            {dict.book.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-video rounded-md overflow-hidden">
             <Image
                src="https://placehold.co/600x400.png"
                alt="Book Cover"
                layout="fill"
                objectFit="cover"
                data-ai-hint="mysterious book"
              />
          </div>
          <p className="mt-4 text-muted-foreground">
            {dict.book.content}
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full transition-all hover:shadow-[0_0_15px_2px_hsl(var(--primary)/0.5)]">
            <Link href="https://ignobilesveritates.com" target="_blank">
              {dict.book.button}
            </Link>
          </Button>
        </CardFooter>
      </Card>
      <Card className="shadow-lg shadow-primary/10 overflow-hidden">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            {dict.subscription.title}
          </CardTitle>
          <CardDescription>
            {dict.subscription.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="relative aspect-video rounded-md overflow-hidden">
             <Image
                src="https://placehold.co/600x400.png"
                alt="Subscription"
                layout="fill"
                objectFit="cover"
                data-ai-hint="secret society"
              />
          </div>
          <p className="mt-4 text-muted-foreground">
            {dict.subscription.content}
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full transition-all hover:shadow-[0_0_15px_2px_hsl(var(--primary)/0.5)]">
            <Link href="https://ignobilesveritates.com" target="_blank">
              {dict.subscription.button}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
