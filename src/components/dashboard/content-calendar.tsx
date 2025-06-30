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
import { useState } from "react";

export function ContentCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <Card className="shadow-lg shadow-primary/10">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" />
          Content Calendar
        </CardTitle>
        <CardDescription>
          Visualize your content schedule and plan ahead.
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
