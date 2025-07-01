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
import { Loader2, Wand2, Search, Info, Plus } from "lucide-react";
import { generateConspiracyThemes } from "@/ai/flows/generate-conspiracy-themes";
import type { GenerateConspiracyThemesOutput } from "@/ai/flows/generate-conspiracy-themes";
import { analyzeTrends, type AnalyzeTrendsOutput } from "@/ai/flows/analyze-trends";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { GeneratedThemesList } from "./generated-themes-list";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import Link from "next/link";

const formSchema = z.object({
  currentEvents: z
    .string()
    .min(10, "Please provide some current events to spark inspiration.")
    .max(500, "Current events summary is too long."),
  keywords: z
    .string()
    .min(2, "Please provide some keywords.")
    .max(100, "Keywords are too long."),
  tone: z.enum(['Serious', 'Satirical', 'Investigative', 'Sensationalist']),
  platform: z.enum(['General', 'Blog Post', 'Twitter Thread', 'Video Script']),
});

export function ThemeGeneratorPage({ lang, dict }: { lang: string, dict: any }) {
  const pageDict = dict.themeGenerator;
  const sharedDict = dict.shared;

  const [loading, setLoading] = useState(false);
  const [result, setResult] =
    useState<GenerateConspiracyThemesOutput | null>(null);
  const { toast } = useToast();

  const [trends, setTrends] = useState<AnalyzeTrendsOutput | null>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [alignWithTrends, setAlignWithTrends] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentEvents: "",
      keywords: "",
      tone: "Investigative",
      platform: "Blog Post",
    },
  });

  const handleAnalyzeTrends = async () => {
    setLoadingTrends(true);
    setTrends(null);
    try {
        const trendResults = await analyzeTrends({ language: lang as 'en' | 'es-AR' });
        setTrends(trendResults);
    } catch (error) {
        console.error("Failed to analyze trends", error);
        toast({
            variant: "destructive",
            title: pageDict.trendAnalysis.errorTitle,
            description: pageDict.trendAnalysis.errorDescription
        });
    } finally {
        setLoadingTrends(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResult(null);
    try {
      const themes = await generateConspiracyThemes({
        ...values,
        trends: alignWithTrends && trends ? trends.trends : undefined,
        language: lang as 'en' | 'es-AR',
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

  const handleSuggestionClick = (field: 'currentEvents' | 'keywords', value: string) => {
    const currentValue = form.getValues(field);
    form.setValue(field, currentValue ? `${currentValue}, ${value}` : value, { shouldValidate: true });
  };

  return (
    <div className="flex flex-col gap-8">
      <Card className="shadow-lg shadow-primary/10">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-primary" />
            {pageDict.title}
          </CardTitle>
          <CardDescription>
            {pageDict.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 rounded-lg border border-dashed p-4 text-center flex flex-col items-center">
            <h3 className="font-headline text-lg">{pageDict.inspiration.title}</h3>
            <p className="text-muted-foreground text-sm mb-3 max-w-md">
                {pageDict.inspiration.description}
            </p>
            <Button onClick={() => handleAnalyzeTrends()} disabled={loadingTrends}>
                {loadingTrends ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                {pageDict.inspiration.button}
            </Button>
          </div>

          {loadingTrends && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span>{pageDict.inspiration.loading}</span>
              </div>
              <Skeleton className="h-40 w-full" />
            </div>
          )}
          {trends && !loadingTrends && (
              <div className="mb-6">
                  <Alert className="border-primary/20">
                     <Info className="h-4 w-4" />
                      <AlertTitle className="font-headline">{pageDict.trendAnalysis.title}</AlertTitle>
                      <AlertDescription className="space-y-4 pt-2">
                        <p className="text-foreground/80 break-words">{trends.summary}</p>
                        
                        <div className="space-y-2">
                          <Label>{pageDict.trendAnalysis.suggestedTopics}</Label>
                          <div className="flex flex-wrap gap-2">
                            {trends.suggestedTopics.map((topic, i) => (
                              <Button 
                                key={i} 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleSuggestionClick('currentEvents', topic)}
                                className="h-auto whitespace-normal text-left justify-start"
                              >
                                <Plus className="mr-2 h-4 w-4 self-start mt-1 shrink-0" />
                                <span className="break-words">{topic}</span>
                              </Button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>{pageDict.trendAnalysis.suggestedKeywords}</Label>
                          <div className="flex flex-wrap gap-2">
                            {trends.suggestedKeywords.map((keyword, i) => (
                               <Button 
                                key={i} 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleSuggestionClick('keywords', keyword)}
                                className="h-auto whitespace-normal text-left justify-start"
                              >
                                <Plus className="mr-2 h-4 w-4 self-start mt-1 shrink-0" />
                                <span className="break-words">{keyword}</span>
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-2">
                            <Switch id="align-trends" checked={alignWithTrends} onCheckedChange={setAlignWithTrends} />
                            <Label htmlFor="align-trends" className="cursor-pointer text-sm">{pageDict.trendAnalysis.alignSwitch}</Label>
                        </div>
                         {alignWithTrends && <div className="flex flex-wrap gap-2">
                            {trends.trends.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                        </div>}
                      </AlertDescription>
                  </Alert>
              </div>
            )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="currentEvents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{pageDict.form.currentEventsLabel}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={pageDict.form.currentEventsPlaceholder}
                        {...field}
                        rows={5}
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
                    <FormLabel>{pageDict.form.keywordsLabel}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={pageDict.form.keywordsPlaceholder}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{pageDict.form.toneLabel}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={pageDict.form.tonePlaceholder} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Serious">{pageDict.form.tones.serious}</SelectItem>
                          <SelectItem value="Satirical">{pageDict.form.tones.satirical}</SelectItem>
                          <SelectItem value="Investigative">{pageDict.form.tones.investigative}</SelectItem>
                          <SelectItem value="Sensationalist">{pageDict.form.tones.sensationalist}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{pageDict.form.formatLabel}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={pageDict.form.formatPlaceholder} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="General">{pageDict.form.formats.general}</SelectItem>
                          <SelectItem value="Blog Post">{pageDict.form.formats.blog}</SelectItem>
                          <SelectItem value="Twitter Thread">{pageDict.form.formats.twitter}</SelectItem>
                          <SelectItem value="Video Script">{pageDict.form.formats.video}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={loading} size="lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {pageDict.form.generatingButton}
                  </>
                ) : (
                  pageDict.form.submitButton
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {loading && !result &&(
        <Card className="shadow-lg shadow-primary/10">
            <CardContent className="pt-6">
                <div className="flex items-center justify-center p-8 rounded-lg border-dashed border-2 bg-card">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4 text-muted-foreground">{pageDict.results.loading}</p>
                </div>
            </CardContent>
        </Card>
      )}

      {result && (
        <Card className="shadow-lg shadow-primary/10">
          <CardHeader>
            <CardTitle className="font-headline">{pageDict.results.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <GeneratedThemesList themes={result.themes} lang={lang} showAlignerButton={true} dict={sharedDict.generatedThemesList} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
