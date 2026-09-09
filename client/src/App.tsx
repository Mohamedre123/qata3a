/**
 * قطاعتي — صفحة هبوط لبيع لوح التقطيع الستانلس بالدفع عند الاستلام،
 * مربوطة بمنصة صفقة عبر سيرفرنا (راجع server/api.ts).
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useRef } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import WhatsAppButton from "./components/WhatsAppButton";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trackPageView } from "./lib/analytics";
import Admin from "./pages/Admin";
import Checkout from "./pages/Checkout";
import Home from "./pages/Home";
import Track from "./pages/Track";
import NotFound from "./pages/NotFound";

function Router() {
  const [location] = useLocation();

  /**
   * زيارة الصفحة الأولى بيسجّلها تحميل البيكسل نفسه (initAnalytics)، فلو
   * سجّلناها هنا كمان هتتبعت مرتين وميتا بتعتبرها أحداث مكرّرة. عشان كده
   * بنتخطّى أول تشغيل ونسجّل تغييرات المسار بعد كده بس.
   */
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    trackPageView();
  }, [location]);

  // لوحة الإعداد صفحة داخلية — مش محتاجة زر تواصل العملاء.
  const showWhatsApp = !location.startsWith("/admin");

  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/track" component={Track} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>

      {showWhatsApp && <WhatsAppButton />}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
