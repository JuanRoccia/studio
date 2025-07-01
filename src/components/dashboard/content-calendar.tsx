"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { useState, useEffect } from "react";

export function ContentCalendar({ dict }: { dict: any }) {
  const [date, setDate] = useState<Date | undefined>();

  useEffect(() => {
    setDate(new Date());
  }, []);

  return (
    <Card className="shadow-lg shadow-primary/10">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" />
          {dict.title}
        </CardTitle>
        <CardDescription>
          {dict.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border"
        />
      </CardContent>
    </Card>
  );
}
