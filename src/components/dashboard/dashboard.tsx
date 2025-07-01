"use client";

import { ConspiracyThemeGenerator } from "./conspiracy-theme-generator";
import { PlatformContentAligner } from "./platform-content-aligner";
import { PerformanceDashboard } from "./performance-dashboard";
import { PromotionCards } from "./promotion-cards";

export function Dashboard({ dict }: { dict: any }) {
  return (
    <div className="grid gap-8 grid-cols-12">
      <div className="col-span-12">
        <PerformanceDashboard dict={dict.dashboardPage.performanceDashboard} />
      </div>
      <div className="col-span-12">
        <ConspiracyThemeGenerator dict={dict.dashboardPage.conspiracyThemeGenerator} sharedDict={dict.shared} />
      </div>
       <div className="col-span-12">
        <PromotionCards dict={dict.dashboardPage.promotionCards} />
      </div>
    </div>
  );
}
