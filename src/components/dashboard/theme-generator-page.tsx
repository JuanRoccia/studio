"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Wand2 } from "lucide-react";
import { generateConspiracyThemes } from "@/ai/flows/generate-conspiracy-themes";
import type { GenerateConspiracyThemesOutput } from "@/ai/flows/generate-conspiracy-themes";
import { generateSuggestions, type GenerateSuggestionsOutput as SuggestionsOutput } from "@/ai/flows/generate-suggestions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

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

export function ThemeGeneratorPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] =
    useState<GenerateConspiracyThemesOutput | null>(null);
  const { toast } = useToast();

  const [suggestions, setSuggestions] = useState<SuggestionsOutput | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [focusedField, setFocusedField] = useState<"currentEvents" | "keywords" | null>(null);

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const result = await generateSuggestions();
        setSuggestions(result);
      } catch (error) {
        console.error("Failed to fetch suggestions", error);
      } finally {
        setSuggestionsLoading(false);
      }
    }
    fetchSuggestions();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentEvents: "",
      keywords: "",
      tone: "Investigative",
      platform: "Blog Post",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResult(null);
    try {
      const themes = await generateConspiracyThemes(values);
      setResult(themes);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error Generating Themes",
        description:
          "There was an issue generating conspiracy themes. Please try again.",
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
            Advanced Theme Generation
          </CardTitle>
          <CardDescription>
            Craft the perfect conspiracy theme by providing context, keywords, and specifying the desired tone and format.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="currentEvents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Events or Topics</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Recent unexplained global phenomena, political shifts, new scientific discoveries..."
                        {...field}
                        rows={5}
                        onFocus={() => setFocusedField('currentEvents')}
                        onBlur={() => setTimeout(() => setFocusedField(null), 150)}
                      />
                    </FormControl>
                     {focusedField === 'currentEvents' && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <span className="text-sm text-muted-foreground self-center">Suggestions:</span>
                          {suggestionsLoading ? Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-8 w-24 rounded-md" />) :
                           suggestions?.currentEvents?.map((suggestion, index) => (
                            <Button
                              key={index}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSuggestionClick('currentEvents', suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., aliens, secret societies, ancient technology, simulation theory" 
                        {...field} 
                        onFocus={() => setFocusedField('keywords')}
                        onBlur={() => setTimeout(() => setFocusedField(null), 150)}
                      />
                    </FormControl>
                    {focusedField === 'keywords' && (
                        <div className="flex flex-wrap gap-2 pt-2">
                           <span className="text-sm text-muted-foreground self-center">Suggestions:</span>
                          {suggestionsLoading ? Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-8 w-24 rounded-md" />) :
                           suggestions?.keywords?.map((suggestion, index) => (
                            <Button
                              key={index}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSuggestionClick('keywords', suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tone</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a tone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Serious">Serious</SelectItem>
                          <SelectItem value="Satirical">Satirical</SelectItem>
                          <SelectItem value="Investigative">Investigative</SelectItem>
                          <SelectItem value="Sensationalist">Sensationalist</SelectItem>
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
                      <FormLabel>Format / Platform</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="General">General Ideas</SelectItem>
                          <SelectItem value="Blog Post">Blog Post Titles</SelectItem>
                          <SelectItem value="Twitter Thread">Twitter Thread Hooks</SelectItem>
                          <SelectItem value="Video Script">Video Script Concepts</SelectItem>
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
                    Generating...
                  </>
                ) : (
                  "Generate Advanced Themes"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center p-8 rounded-lg border bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">The AI is uncovering hidden truths...</p>
        </div>
      )}

      {result && (
        <Card className="shadow-lg shadow-primary/10">
          <CardHeader>
            <CardTitle className="font-headline">Generated Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-3 bg-secondary/30 p-6 rounded-md">
              {result.themes.map((theme, index) => (
                <li key={index} className="text-foreground/90">{theme}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
