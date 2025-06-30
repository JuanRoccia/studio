"use client";

import { useState } from "react";
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
import { Loader2, Share2 } from "lucide-react";
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

export function PlatformContentAligner() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AlignPlatformContentOutput | null>(
    null
  );
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResult(null);
    try {
      const suggestion = await alignPlatformContent(values);
      setResult(suggestion);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error Generating Content",
        description: "There was an issue generating content. Please try again.",
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
          Platform Content Aligner
        </CardTitle>
        <CardDescription>
          Get AI-driven content suggestions tailored for each platform.
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
                  <FormLabel>Conspiracy Theme</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the theme from the generator" {...field} />
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
                  <FormLabel>Platform</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a platform" />
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
                    <FormLabel>Target Audience</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your target audience"
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
                  Aligning...
                </>
              ) : (
                "Get Suggestion"
              )}
            </Button>
          </form>
        </Form>
        {result && (
          <div className="mt-6 space-y-4 bg-secondary/30 p-4 rounded-md">
            <div>
              <h3 className="font-headline text-lg">Content Suggestion:</h3>
              <p className="text-muted-foreground">{result.contentSuggestion}</p>
            </div>
            <div>
              <h3 className="font-headline text-lg">Reasoning:</h3>
              <p className="text-muted-foreground">{result.reasoning}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
