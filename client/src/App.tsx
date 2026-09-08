/**
 * قطاعتي — صفحة هبوط لبيع لوح التقطيع الستانلس بالدفع عند الاستلام،
 * مربوطة بمنصة صفقة عبر سيرفرنا (راجع server/api.ts).
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trackPageView } from "./lib/analytics";
import Admin from "./pages/Admin";
import Checkout from "./pages/Checkout";
import Home from "./pages/Home";
import Track from "./pages/Track";
import NotFound from "./pages/NotFound";

function Router() {
  const [location] = useLocation();

  // تسجيل زيارة الصفحة مع كل تغيير مسار (الموقع SPA فالتحميل بيحصل مرة واحدة).
  useEffect(() => {
    trackPageView();
  }, [location]);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/track" component={Track} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
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
