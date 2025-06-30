"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const engagementData = [
  { date: "Mon", engagement: 2400 },
  { date: "Tue", engagement: 1398 },
  { date: "Wed", engagement: 9800 },
  { date: "Thu", engagement: 3908 },
  { date: "Fri", engagement: 4800 },
  { date: "Sat", engagement: 3800 },
  { date: "Sun", engagement: 4300 },
];

const trafficData = [
  { source: "Twitter", value: 400 },
  { source: "Instagram", value: 300 },
  { source: "TikTok", value: 200 },
  { source: "Organic", value: 278 },
  { source: "Referral", value: 189 },
];

const chartConfig = {
  engagement: {
    label: "Engagement",
    color: "hsl(var(--primary))",
  },
  value: {
    label: "Traffic",
    color: "hsl(var(--primary))",
  },
};

export function PerformanceDashboard() {
  return (
    <Card className="shadow-lg shadow-primary/10">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          Performance Dashboard
        </CardTitle>
        <CardDescription>
          Track your content performance and audience engagement.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h4 className="font-headline text-lg mb-2">Weekly Engagement</h4>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart
              data={engagementData}
              margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: "3 3" }}
                content={<ChartTooltipContent />}
              />
              <Line
                type="monotone"
                dataKey="engagement"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{
                  fill: "hsl(var(--primary))",
                  r: 4,
                }}
              />
            </LineChart>
          </ChartContainer>
        </div>
        <div>
          <h4 className="font-headline text-lg mb-2">Traffic Sources</h4>
           <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={trafficData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--border) / 0.5)"/>
              <XAxis type="number" hide />
              <YAxis dataKey="source" type="category" tickLine={false} axisLine={false} />
               <ChartTooltip
                cursor={{ fill: "hsl(var(--secondary))" }}
                content={<ChartTooltipContent />}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
