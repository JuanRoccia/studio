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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2 } from "lucide-react";
import { generateConspiracyThemes } from "@/ai/flows/generate-conspiracy-themes";
import type { GenerateConspiracyThemesOutput } from "@/ai/flows/generate-conspiracy-themes";
import { useToast } from "@/hooks/use-toast";
import { GeneratedThemesList } from "./generated-themes-list";

const formSchema = z.object({
  currentEvents: z
    .string()
    .min(10, "Please provide some current events to spark inspiration.")
    .max(500, "Current events summary is too long."),
  keywords: z
    .string()
    .min(2, "Please provide some keywords.")
    .max(100, "Keywords are too long."),
});

export function ConspiracyThemeGenerator({ dict, sharedDict }: { dict: any, sharedDict: any }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] =
    useState<GenerateConspiracyThemesOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentEvents: "",
      keywords: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResult(null);
    try {
      const themes = await generateConspiracyThemes({
        ...values,
        tone: "Investigative",
        platform: "General",
      });
      setResult(themes);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: sharedDict.toasts.error_generating_themes_title,
        description: sharedDict.toasts.error_generating_themes_description,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-lg shadow-primary/10">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-primary" />
          {dict.title}
        </CardTitle>
        <CardDescription>
          {dict.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentEvents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.form.currentEventsLabel}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={dict.form.currentEventsPlaceholder}
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.form.keywordsLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={dict.form.keywordsPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {dict.form.generatingButton}
                </>
              ) : (
                dict.form.submitButton
              )}
            </Button>
          </form>
        </Form>
        {result && (
           <div className="mt-6">
            <h3 className="font-headline text-xl mb-4">{dict.results.title}</h3>
            <GeneratedThemesList themes={result.themes} dict={sharedDict.generatedThemesList} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
