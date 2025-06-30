"use client";

import { ConspiracyThemeGenerator } from "./conspiracy-theme-generator";
import { PlatformContentAligner } from "./platform-content-aligner";
import { TaskScheduler } from "./task-scheduler";
import { PerformanceDashboard } from "./performance-dashboard";
import { ContentCalendar } from "./content-calendar";
import { PromotionCards } from "./promotion-cards";

export function Dashboard() {
  return (
    <div className="grid gap-8 grid-cols-12">
      <div className="col-span-12">
        <PerformanceDashboard />
      </div>
      <div className="col-span-12 lg:col-span-7">
        <ConspiracyThemeGenerator />
      </div>
       <div className="col-span-12 lg:col-span-5">
        <PlatformContentAligner />
      </div>
      <div className="col-span-12 lg:col-span-6 xl:col-span-5">
         <TaskScheduler />
      </div>
      <div className="col-span-12 lg:col-span-6 xl:col-span-7">
        <ContentCalendar />
      </div>
       <div className="col-span-12">
        <PromotionCards />
      </div>
    </div>
  );
}
