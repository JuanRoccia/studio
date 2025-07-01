"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Share2, Copy, Check, ArrowRight } from "lucide-react";
import { alignPlatformContent } from "@/ai/flows/align-platform-content";
import type { AlignPlatformContentOutput } from "@/ai/flows/align-platform-content";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  theme: z.string().min(3, "Theme must be at least 3 characters."),
  bookTitle: z
    .string()
    .min(3, "Book title must be at least 3 characters."),
  platform: z.enum(["Twitter", "Instagram", "TikTok"]),
  targetAudience: z
    .string()
    .min(10, "Target audience description is too short."),
});

export function PlatformContentAligner({ dict, sharedDict, showPublisherButton = false }: { dict: any, sharedDict: any, showPublisherButton?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AlignPlatformContentOutput | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      theme: "",
      bookTitle: "The Ignoble Verities",
      platform: "Twitter",
      targetAudience: "Skeptics and truth-seekers interested in hidden knowledge.",
    },
  });
  
  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast({
        title: sharedDict.toasts.copy_suggestion_success,
      });
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error("Failed to copy: ", err);
      toast({
        variant: "destructive",
        title: sharedDict.toasts.copy_suggestion_error_title,
        description: sharedDict.toasts.copy_suggestion_error_description,
      });
    });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResult(null);
    setCopied(false);
    try {
      const suggestion = await alignPlatformContent(values);
      setResult(suggestion);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: sharedDict.toasts.error_generating_content_title,
        description: sharedDict.toasts.error_generating_content_description,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-lg shadow-primary/10 w-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Share2 className="w-6 h-6 text-primary" />
          {dict.title}
        </CardTitle>
        <CardDescription>
          {dict.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.themeLabel}</FormLabel>
                  <FormControl>
                    <Input placeholder={dict.form.themePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.form.platformLabel}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={dict.form.platformPlaceholder} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Twitter">Twitter</SelectItem>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="TikTok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.form.audienceLabel}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={dict.form.audiencePlaceholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {dict.form.aligningButton}
                </>
              ) : (
                dict.form.submitButton
              )}
            </Button>
          </form>
        </Form>
        
        {result && (
          <div className="mt-6 space-y-4">
            <div className="space-y-4 bg-secondary/30 p-6 rounded-md">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-lg">{dict.results.suggestionTitle}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(result.contentSuggestion)}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Copy suggestion"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-muted-foreground break-words">{result.contentSuggestion}</p>
              </div>
              <div className="space-y-2 pt-2">
                <h3 className="font-headline text-lg">{dict.results.reasoningTitle}</h3>
                <p className="text-muted-foreground break-words">{result.reasoning}</p>
              </div>
            </div>

            {showPublisherButton && (
              <div className="flex justify-end">
                <Button asChild size="lg">
                    <Link href={{
                      pathname: '/dashboard/publisher',
                      query: { content: result.contentSuggestion, theme: form.getValues('theme') }
                    }}>
                        {dict.results.continueButton}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
