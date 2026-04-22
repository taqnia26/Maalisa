import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { Layout } from "@/components/Layout";
import { CustomCursor } from "@/components/CustomCursor";
import { Preloader } from "@/components/Preloader";

import Home from "@/pages/Home";
import RoomsPage from "@/pages/Rooms";
import SuitesPage from "@/pages/Suites";
import RoomDetail from "@/pages/RoomDetail";
import BookingPage from "@/pages/Booking";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminRooms from "@/pages/admin/Rooms";
import AdminBookings from "@/pages/admin/Bookings";
import AdminFinance from "@/pages/admin/Finance";
import AdminGuests from "@/pages/admin/Guests";
import AdminCalendar from "@/pages/admin/Calendar";
import AdminBranches from "@/pages/admin/Branches";
import AdminSettings from "@/pages/admin/Settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
});

function PublicRouter() {
  return (
    <Switch>
      {/* Admin routes (no public layout) */}
      <Route path="/admin/login" component={() => <LoginPage adminMode />} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/rooms" component={AdminRooms} />
      <Route path="/admin/bookings" component={AdminBookings} />
      <Route path="/admin/finance" component={AdminFinance} />
      <Route path="/admin/guests" component={AdminGuests} />
      <Route path="/admin/calendar" component={AdminCalendar} />
      <Route path="/admin/branches" component={AdminBranches} />
      <Route path="/admin/settings" component={AdminSettings} />

      {/* Public routes — wrapped in Layout */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/rooms" component={RoomsPage} />
            <Route path="/suites" component={SuitesPage} />
            <Route path="/rooms/:id" component={RoomDetail} />
            <Route path="/booking" component={BookingPage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/register" component={RegisterPage} />
            <Route path="/profile" component={Profile} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

/**
 * Force native date / number / time pickers to render with English (Latin)
 * digits and month names regardless of the document's UI language.
 */
function useEnglishNumericInputs() {
  useEffect(() => {
    const SELECTOR = 'input[type="date"],input[type="month"],input[type="datetime-local"],input[type="time"],input[type="week"],input[type="number"]';
    const apply = (el: Element) => {
      el.setAttribute("lang", "en-US");
      el.setAttribute("dir", "ltr");
    };
    const applyAll = (root: ParentNode) => root.querySelectorAll(SELECTOR).forEach(apply);
    applyAll(document);
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          const el = n as Element;
          if (el.matches?.(SELECTOR)) apply(el);
          if ("querySelectorAll" in el) applyAll(el);
        });
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
}

function App() {
  useEnglishNumericInputs();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Preloader />
              <CustomCursor />
              <PublicRouter />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
