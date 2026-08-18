import { AppProviders } from "@/providers/AppProviders";
import { AppRouter } from "@/router/AppRouter";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const App = () => (
  <ErrorBoundary>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </ErrorBoundary>
);

export default App;
